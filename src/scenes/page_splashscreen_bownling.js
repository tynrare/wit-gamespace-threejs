/** @namespace Pages/Scenes */

import AdTestcaseBowling from "../tests/ad_tc_bowling.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import { Vector3 } from "three";
import { Vec3Up, Vec3Zero, cache, clamp } from "../math.js";
import { oimo } from "../lib/OimoPhysics.js";
import Loader from "../loader.js";
import { InputAction, InputsDualstick } from "../pawn/inputs_dualstick.js";
import CameraTopdown from "../pawn/camera_topdown.js";

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

    /** @type {InputsDualstick} */
    this.inputs = null;

    /** @type {CameraTopdown} */
    this.camera_controls = null;
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    if (!this.loaded) {
      return;
    }

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
      const f = Math.min(1, e / 5000) * 0.3;
      for (const i in this.logo_letters) {
        const ll = this.logo_letters[i];
        this.level.pawn.stabilizate_pawn(dt, ll, f);

        const targ_pos = this.level.physics.cache.vec3_0;
        const curr_pos = this.level.physics.cache.vec3_1;
        targ_pos.init(ll._initial_pos_x, 0, ll._initial_pos_z);
        ll.getPositionTo(curr_pos);
        targ_pos.subEq(curr_pos);
        const dist = clamp(-1, 1, targ_pos.length());
        targ_pos.normalize().scaleEq(f * 10 * dist);
        ll.applyForceToCenter(targ_pos);

				let shape = ll.getShapeList();
				while(shape) {
					shape.setRestitution(0);
					shape = shape.getNext();
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
  }

  run() {
    App.instance.start(this.container.querySelector("render"));
    App.instance.spashscreen(true);

    const render = App.instance.render;
    this.camerapos.set(9, 7, 0);
    render.camera.position.copy(this.camerapos);

    this.level = new AdTestcaseBowling();
    this.load();

    this.scenario_bots_spawned = false;

    this.btn_play = this.container.querySelector("btn#ssb_play_btn");
    this.page_inputs_overlay = this.container.querySelector(
      "overlay#ssb_joysticks",
    );
    this._btn_play_click_listener = this._start_play.bind(this);
    this.btn_play.addEventListener("click", this._btn_play_click_listener);
  }

  load() {
    this.loaded = false;
    const render = App.instance.render;
    const p = [];

    p.push(
      new Promise((resolve) => {
        this.level.run(resolve, { bots: 0, scene: "c" });
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
      this.btn_play.classList.add("show");
      this.page_inputs_overlay.classList.add("hidden");
    });
  }

  _start_play() {
    if (!this.btn_play.classList.contains("show")) {
      return;
    }

    this.page_inputs_overlay.classList.remove("hidden");
    this.btn_play.classList.remove("show");

    this.inputs = new InputsDualstick(
      this.container,
      this.container,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();

    this.camera_controls = new CameraTopdown();
    this.camera_controls.config.distance = 10;
    this.camera_controls.config.height = 10;
    this.camera_controls.init(App.instance.render.camera, this.level.pawn.pawn_dbg_mesh);
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
    this.inputs.stop();
    this.inputs = null;

    App.instance.pause();
  }
}

export default PageSplashscreenBowling;
