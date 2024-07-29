/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { createFloorPlane } from "./utils.js";
import Scoreboard from "../scoreboard.js";
import { InputsMap, InputAction } from "../pawn/inputs_map.js";
import { Physics, RigidBodyType } from "../physics.js";
import { cache } from "../math.js";

/** @enum {number} */
const SimpleSessionState = {
  MENU: 0,
  PLAY: 1,
};

class SimpleSession {
  constructor() {
    /** @type {SimpleSessionState} */
    this.state = SimpleSessionState.MENU;
  }
  /**
   * @param {HTMLElement} container .
   * @param {function} onplay .
   */
  init(container, onplay) {
    const ui = container.querySelector(".gp-ui");
    const menu = container.querySelector(".gp-menu");
    const inputs = container.querySelector(".gp-inputs");
    const hearts = ui.querySelector(".gp-ui-hearts");
    const score = ui.querySelector(".gp-ui-score .score");
    const playbtn = menu.querySelector(".playbtn");
    const scoreboard = menu.querySelector(".scoreboard");

    this.container = container;
    this.ui = ui;
    this.menu = menu;
    this.inputs = inputs;
    this.hearts = hearts;
    this.score = score;
    this.playbtn = playbtn;
    this.scoreboard = scoreboard;
    this.onplay = onplay;

    this._playbtn_click_event = this.startplay.bind(this);
    playbtn.addEventListener("click", this._playbtn_click_event);

    this.startmenu();
    this.printscore(0);

    return this;
  }

  startmenu() {
    this.playbtn.classList.add("show");
    this.ui.classList.add("hidden");
    this.inputs.classList.add("hidden");
    this.scoreboard.classList.remove("hidden");

    Scoreboard.instance.get_rating().then((r) => {
      this.scoreboard.innerHTML = Scoreboard.instance.construct_scoreboard(r);
    });

    this.state = SimpleSessionState.MENU;
  }

  startplay() {
    if (this.state == SimpleSessionState.PLAY) {
      return;
    }

    App.instance.fullscreen(true, this.container);

    this.state = SimpleSessionState.PLAY;

    this.onplay();

    this.playbtn.classList.remove("show");
    this.inputs.classList.remove("hidden");
    this.ui.classList.remove("hidden");
    this.scoreboard.classList.add("hidden");
  }

  endplay(score) {
    Scoreboard.instance.save_score(score).then(() => this.startmenu());
  }

  printscore(score) {
    this.score.innerHTML = score;
  }

  dispose() {
    this.playbtn.removeEventListener("click", this._playbtn_click_event);
    this._playbtn_click_event = null;
  }
}

const __SimpleBlockbreakerBrickColors = [
  0x000000, 0xee0000, 0x00ff00, 0xffffff,
];
class SimpleBlockbreakerBrick {
  constructor(body, model) {
    this.body = body;
    this.model = model;
    this.hit_timestamp = null;
    this.hitpoints = 3;
  }

  static get_color(hitpoints) {
    return __SimpleBlockbreakerBrickColors[hitpoints - 1] ?? 0xff00ff;
  }
}

class LevelBlockbreaker {
  constructor() {
    /** @type {Physics} */
    this.physics = null;
    this.guids = 0;
    /** @type {Object<string, SimpleBlockbreakerBrick>} */
    this.bricks = {};
    /** @type {Object<string, SimpleBlockbreakerBrick>} */
    this.bricks_del_query = {};

    this.config = {
      ball_speed: 20,
    };
  }

  startplay() {
    const v = this.physics.cache.vec3_0;
    v.init(10, 0, 10);
    this.ball_body.setLinearVelocity(v);
  }

  run() {
    this.physics = new Physics().run({ fixed_step: false });

    this._create_level_box(15, 25);
    this._create_bricks(new THREE.Vector3(0, 0, -7), new THREE.Vector2(6, 7));

    const pos = cache.vec3.v0;
    const ball = this.physics.create_sphere(
      pos.set(0, 0, 0),
      0.5,
      RigidBodyType.DYNAMIC,
      {
        restitution: 1,
        density: 0.1,
      },
    );
    this.ball_body = ball;
    const ball_mesh = App.instance.render.utils.spawn_icosphere0(0xffff00, 0.5);
    App.instance.render.scene.add(ball_mesh);
    this.physics.attach(ball, ball_mesh);

    return this;
  }

  _create_level_box(w = 20, h = 20) {
    const pos = cache.vec3.v0;
    const size = cache.vec3.v1;
    this.physics.create_box(
      pos.set(0, -1, 0),
      size.set(100, 2, 100),
      RigidBodyType.STATIC,
    );

    const opts = {
      restitution: 1,
      friction: 0,
    };

    this.physics.utils.create_physics_box(
      pos.set(0, 1, h * 0.5),
      size.set(w + 1, 1, 1),
      RigidBodyType.STATIC,
      opts,
    );
    this.physics.utils.create_physics_box(
      pos.set(0, 1, -h * 0.5),
      size.set(w + 1, 1, 1),
      RigidBodyType.STATIC,
      opts,
    );
    this.physics.utils.create_physics_box(
      pos.set(w * 0.5, 1, 0),
      size.set(1, 1, h + 1),
      RigidBodyType.STATIC,
      opts,
    );
    this.physics.utils.create_physics_box(
      pos.set(-w * 0.5, 1, 0),
      size.set(1, 1, h + 1),
      RigidBodyType.STATIC,
      opts,
    );
  }

  _create_bricks(origin, grid, randompos = 0) {
    const BOX_SIZE = cache.vec3.v0.set(2, 0.5, 1);
    const opts = {
      restitution: 1,
    };
    for (let x = 0; x < grid.x; x++) {
      for (let y = 0; y < grid.y; y++) {
        let x1 =
          origin.x +
          (x - grid.x * 0.5 + 0.5) * BOX_SIZE.x * 1.1 +
          Math.random() * randompos;
        let y1 = origin.y + 0.5;
        let z1 =
          origin.z +
          (y - grid.y * 0.5 + 0.5) * BOX_SIZE.z * 1.2 +
          Math.random() * randompos;
        let color = new THREE.Color(
          Math.random(),
          Math.random(),
          Math.random(),
        );
        const hitpoints = Math.round(Math.random() * 3 + 1);
        const dynamic = hitpoints > 1;
        const type = dynamic ? RigidBodyType.DYNAMIC : RigidBodyType.STATIC;
        color = SimpleBlockbreakerBrick.get_color(hitpoints);
        const id = this.physics.utils.create_physics_box(
          cache.vec3.v1.set(x1, y1, z1),
          BOX_SIZE,
          type,
          opts,
          color,
        );

        const brick = new SimpleBlockbreakerBrick(
          this.physics.bodylist[id],
          this.physics.meshlist[id],
        );
        brick.hitpoints = hitpoints;
        this.bricks[id] = brick;
      }
    }
  }

  step(dt) {
    this.physics.step(dt);
    this.update_del_bricks_query();
    this.update_ball();
  }

  update_ball() {
    this.update_ball_collisions();
    const vel = this.physics.cache.vec3_0;
    this.ball_body.getLinearVelocityTo(vel);
    const speed = vel.length();
    const vely = vel.y;
    vel.normalize().scaleEq(Math.max(speed, this.config.ball_speed));
    vel.y = vely * 0.1;
    this.ball_body.setLinearVelocity(vel);
  }

  update_ball_collisions() {
    let contact_link_list = this.ball_body.getContactLinkList();
    while (contact_link_list) {
      const contact = contact_link_list.getContact();
      const other = contact_link_list.getOther();

      contact_link_list = contact_link_list.getNext();

      if (!contact.isTouching()) {
        continue;
      }

      const brick = this.bricks[other.id];
      if (!brick) {
        continue;
      }

      this._hit_brick(other.id);
    }
  }

  _hit_brick(id) {
    const brick = this.bricks[id];

    brick.hitpoints -= 1;
    brick.model.material = App.instance.render.utils.create_material0(
      SimpleBlockbreakerBrick.get_color(brick.hitpoints),
    );
    if (brick.hitpoints > 0) {
      return;
    }

    delete this.bricks[id];
    brick.hit_timestamp = Date.now();
    this.bricks_del_query[id] = brick;
  }

  update_del_bricks_query() {
    const now = Date.now();
    for (const k in this.bricks_del_query) {
      const brick = this.bricks_del_query[k];
      const delta = now - brick.hit_timestamp;
      const deltafactor = delta / 100;
      brick.model.scale.setScalar(1 - deltafactor);
      if (deltafactor < 1) {
        continue;
      }
      this.physics.remove(brick.body);
      brick.model.removeFromParent();
      delete this.bricks_del_query[k];
    }
  }

  stop() {
    this.physics.stop();
    this.bricks = {};
    this.physics = null;
  }
}

class SceneBlockbreaker {
  constructor() {
    /** @type {LightsA} */
    this.lights = null;

    /** @type {MapControls} */
    this.controls = null;

    /** @type {LevelBlockbreaker} */
    this.level = null;
  }

  startplay() {
    this.level.startplay();
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    this.controls?.update();
    this.level.step(dt);
  }

  run() {
    const render = App.instance.render;
    const scene = render.scene;

    render.pixelate(0.5, false);

    scene.background = new THREE.Color(0x66c0dc);
    this.lights = new LightsA().run(App.instance.render);
    this.lights.lights.directional.intensity = 1;

    // floor
    {
      const plane = createFloorPlane(1);
      scene.add(plane);
      this.plane = plane;
    }

    this.level = new LevelBlockbreaker().run();

    render.camera.position.set(0, 20, 5);
    const target = cache.vec3.v0;
    render.camera.lookAt(target.set(0, 0, 1.5));

    // camera controls
    /*
    const controls = new MapControls(render.camera, render.renderer.domElement);
    controls.enableDamping = true;
    this.controls = controls;
		*/

    return this;
  }

  stop() {
    this.lights.stop();
    this.level.stop();
    this.lights = null;
    this.level = null;
    this.controls = null;
  }
}

/**
 * @class PageBlockbreaker
 * @memberof Pages/Tests
 */
class PageBlockbreaker extends PageBase {
  constructor() {
    super();
    /** @type {SimpleSession} */
    this.session = null;

    /** @type {SceneBlockbreaker} */
    this.scene = null;

    /** @type {InputsMap} */
    this.inputs = null;
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.scene.step(dt);
  }

  run() {
    App.instance.start(this.container.querySelector("render"));
    App.instance.render.get_camera_fov_factor = (w, h) => {
      return h / w;
    };

    this.session = new SimpleSession().init(this.container, () =>
      this.startplay(),
    );

    this.scene = new SceneBlockbreaker().run();

    this.inputs = new InputsMap(
      this.session.inputs,
      App.instance.render,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();
  }

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input(action, start) {}

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input_analog(x, z, action) {
    if (action === InputAction.action_c) {
    }
  }

  startplay() {
    this.scene.startplay();
  }

  stop() {
    App.instance.pause();
    App.instance.render.pixelate(false);

    this.session.dispose();
    this.scene.stop();
    this.inputs.stop();
    this.scene = null;
    this.session = null;
    this.inputs = null;
  }
}

export default PageBlockbreaker;
