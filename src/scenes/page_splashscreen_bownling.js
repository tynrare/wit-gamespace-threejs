/** @namespace Pages/Scenes */

import * as THREE from "three";
import { Color, Vector3 } from "three";

import App from "../app.js";
import { oimo } from "../lib/OimoPhysics.js";
import Loader from "../loader.js";
import { cache, clamp, Vec3Up, Vec3Zero } from "../math.js";
import PageBase from "../page_base.js";
import CameraTopdown from "../pawn/camera_topdown.js";
import { InputAction, InputsDualstick } from "../pawn/inputs_dualstick.js";
import { RigidBodyType } from "../physics.js";
import Scoreboard from "../scoreboard.js";
import AdTestcaseBowling from "../tests/ad_tc_bowling.js";
import { get_material_blob_a, update_shaders } from "../vfx/shaders.js";

class PageSplashscreenBowling extends PageBase {
  constructor() {
    super();

    /** @type {AdTestcaseBowling} */
    this.level = null;

    this.camerapos = new Vector3();

    this.elapsed = 0;

    /** @type {Array<oimo.dynamics.rigidbody.RigidBody>} */
    this.logo_letters = [];

    this.scenario_bots_spawned = false;
    this.loaded = false;

    /** @type {HTMLElement} */
    this.btn_play = null;
    /** @type {HTMLElement} */
    this.page_inputs_overlay = null;
    /** @type {HTMLElement} */
    this.page_ui_overlay = null;

    /** @type {InputsDualstick} */
    this.inputs = null;

    /** @type {CameraTopdown} */
    this.camera_controls = null;

    this.game_hearts_max = 3;
    this.game_hearts = 0;
    this.game_score = 0;
    this.game_hitlog = {};

    this.inplay = false;
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    if (!this.loaded) {
      return;
    }

    update_shaders();

    this.elapsed += dt;

    this.level.step(dt);

    // camera
    if (this.camera_controls) {
      this.camera_controls.step(dt);
    } else {
      const render = App.instance.render;
      render.camera.position.lerp(this.camerapos, 1 - Math.pow(0.2, dt * 1e-3));
      const camera_target = cache.vec3.v0;
      camera_target.set(0, 1, 0);
      render.camera.lookAt(camera_target);
    }

    // === scenario
    // --- write letters
    const letters_stabilizate_delay = 5000;
    if (this.elapsed > letters_stabilizate_delay) {
      const e = this.elapsed - letters_stabilizate_delay;
      const f = Math.min(1, e / 5000) * 0.1;
      for (const i in this.logo_letters) {
        const ll = this.logo_letters[i];
        this.level.pawn.stabilizate_pawn(dt, ll, f);

        const targ_pos = this.level.physics.cache.vec3_0;
        const curr_pos = this.level.physics.cache.vec3_1;
        targ_pos.init(ll._initial_pos_x, 0, ll._initial_pos_z);
        ll.getPositionTo(curr_pos);
        targ_pos.subEq(curr_pos);
        const dist = clamp(-1, 1, targ_pos.length());
        targ_pos.normalize().scaleEq(f * 20 * dist);
        ll.applyForceToCenter(targ_pos);

        let shape = ll.getShapeList();
        if (ll.getLinearDamping() != 3.73) {
          ll.setLinearDamping(3.73);
          while (shape) {
            shape.setRestitution(0);
            shape.setFriction(1e-3);
            shape = shape.getNext();
          }
        }
      }
    }

    // --- spawn additional bots
    if (
      !this.scenario_bots_spawned &&
      this.elapsed > letters_stabilizate_delay * 0.7
    ) {
      this.scenario_bots_spawned = true;
      this.level.create_bots(5);
    }

    this.step_inplay(dt);
  }

  step_inplay(dt) {
    if (!this.inplay) {
      return;
    }

    if (this.game_hearts_max - this.level.pawn.falls != this.game_hearts) {
      this.game_hearts = this.game_hearts_max - this.level.pawn.falls;
      const hearts = this.page_ui_overlay.querySelectorAll("#hearts pic.heart");
      hearts.forEach((h, i) => {
        h.classList[i < this.game_hearts ? "remove" : "add"]("disabled");
      });
    }

    const l = this.page_ui_overlay.querySelector("#score label.score");
    l.innerHTML = this.game_score;

    for (const i in this.level.pawns) {
      const p = this.level.pawns[i];
      if (!p.hitby.stun_timestamp || this.game_hitlog[p.hitby.stun_timestamp]) {
        continue;
      }

      if (p.id == this.level.pawn.id) {
        // player pawn stunned
        this.game_hitlog[p.hitby.stun_timestamp] = p.hitby.id;
        this.level.pawn.falls += 1;
        this.level.pawn.stuns_count += 1;
      } else if (p.hitby.id == this.level.pawn.id) {
        // other pawn stunned by player
        this.game_hitlog[p.hitby.stun_timestamp] = p.hitby.id;
        this.game_score += 1;
      }
    }

    if (this.game_hearts <= 0) {
      this._end_play();
    }
  }

  run() {
    App.instance.start(this.container.querySelector("render"));
    App.instance.spashscreen(true);

    const render = App.instance.render;
    this.camerapos.set(9, 7, 0);
    // this.camerapos.set(0, 45, 0);
    render.camera.position.copy(this.camerapos);

    this.level = new AdTestcaseBowling();
    this.load();

    {
      const pos = new Vector3(0, -1, 0);
      const size = new Vector3(13, 2, 0);
      const type = RigidBodyType.STATIC;
      const opts = { sides: 32 };
      const body = this.level.physics.create_cylinder(pos, size, type, opts);

      size.set(20, 2, 0);
      let geometry = new THREE.CylinderGeometry(
        size.x,
        size.x,
        size.y,
        opts?.sides ?? 6,
      );
      let material = get_material_blob_a(
        Loader.instance.get_texture("tex_noise0.png"),
      );

      let mesh = new THREE.Mesh(geometry, material);
      App.instance.render.scene.add(mesh);

      this.level.physics.attach(body, mesh);
      /** @type {THREE.Mesh} */
      const floor_mesh = mesh;
    }
    App.instance.render.scene.background = new Color(0x000);

    this.scenario_bots_spawned = false;

    this.btn_play = this.container.querySelector("btn#ssb_play_btn");
    this.page_inputs_overlay = this.container.querySelector(
      "overlay#ssb_joysticks",
    );
    this.page_ui_overlay = this.container.querySelector("overlay#ssb_ui");
    this.page_scoreboard = this.container.querySelector("#ssb_scoreboard");
    this._btn_play_click_listener = this._start_play.bind(this);
    this.btn_play.addEventListener("click", this._btn_play_click_listener);
  }

  load() {
    this.loaded = false;
    const render = App.instance.render;
    const p = [];

    p.push(
      new Promise((resolve) => {
        this.level.run(resolve, { bots: 0, scene: null });
      }),
    );
    p.push(
      Loader.instance.get_gltf("bowling/logo.glb").then((gltf) => {
        const scene = gltf.scene.clone();
        render.scene.add(scene);
        scene.position.y = 10;
        const letters = this.level.parse_playscene(scene, true, {
          restitution: 1.2,
          adamping: 3,
          friction: 0.1,
          density: 2,
          ldamping: 0.5,
        });
        this.logo_letters.splice(0, 0, ...letters);
        for (const i in this.logo_letters) {
          const ll = this.logo_letters[i];
          const p = this.level.physics.cache.vec3_0;
          ll.getPositionTo(p);
          ll._initial_pos_x = p.x;
          ll._initial_pos_z = p.z;
          p.init(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
          ll.setAngularVelocity(p);
        }
      }),
    );
    Promise.all(p).then(() => {
      App.instance.spashscreen(false);
      this.loaded = true;
      this.show_menu();
    });
  }

  show_menu() {
    this.btn_play.classList.add("show");
    this.page_inputs_overlay.classList.add("hidden");
    this.page_ui_overlay.classList.add("hidden");
    this.page_scoreboard.classList.remove("hidden");

    Scoreboard.instance.get_rating().then((r) => {
      this.page_scoreboard.innerHTML =
        Scoreboard.instance.construct_scoreboard(r);
    });
  }

  show_play() {
    this.page_inputs_overlay.classList.remove("hidden");
    this.page_ui_overlay.classList.remove("hidden");
    this.btn_play.classList.remove("show");
    this.page_scoreboard.classList.add("hidden");
  }

  _end_play() {
    if (!this.inplay) {
      return;
    }

    this.inplay = false;

    Scoreboard.instance
      .save_score(this.game_score)
      .then(() => this.show_menu());

    this.camera_controls?.dispose();
    this.camera_controls = null;

    this.inputs?.stop();
    this.inputs = null;

    const pb = this.level?.pawn?.pawn_body;
    if (pb) {
      const v = this.level.physics.cache.vec3_0;
      v.init(0, 10, 0);
      pb.setPosition(v);
    }
  }

  _start_play() {
    if (!this.btn_play.classList.contains("show")) {
      return;
    }

    this.inplay = true;

    this.show_play();

    this.inputs = new InputsDualstick(
      this.container,
      this.container,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();

    this.camera_controls = new CameraTopdown();
    this.camera_controls.config.distance = 10;
    this.camera_controls.config.height = 15;
    this.camera_controls.init(
      App.instance.render.camera,
      this.level.pawn.pawn_dbg_mesh,
    );

    for (const i in this.level.pawns) {
      const p = this.level.pawns[i];
      p.falls = 0;
      p.stuns_count = 0;
    }

    this.game_hearts = 0;
    this.game_score = 0;
    this.game_hitlog = {};
  }

  input(type, start) {
    this.level.pawn.action(type, start);
    this.camera_controls.zoom(type == InputAction.action_b && start);
  }

  /**
   * @param {number} x .
   * @param {number} x .
   * @param {string} tag .
   * @param {InputAction} type .
   */
  input_analog(x, y, tag, type) {
    const v = cache.vec3.v0;
    const p = cache.vec3.v1;
    App.instance.render.camera.getWorldDirection(v);
    const camera_rot = Math.atan2(-v.x, -v.z);
    p.set(x, 0, y).applyAxisAngle(Vec3Up, camera_rot);
    this.level.pawn.action_analog(p.x, p.z, type);
  }

  stop() {
    this.level.stop();
    this.level = null;
    this.elapsed = 0;
    this.logo_letters.length = 0;
    this.btn_play.classList.remove("show");
    this.btn_play.removeEventListener("click", this._btn_play_click_listener);
    this._btn_play_click_listener = null;
    this.btn_play = null;
    this.page_inputs_overlay = null;
    this.page_ui_overlay = null;
    this.inputs?.stop();
    this.inputs = null;
    this.camera_controls?.dispose();
    this.camera_controls = null;

    App.instance.pause();
  }
}

export default PageSplashscreenBowling;
