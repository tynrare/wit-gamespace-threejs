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
import { cache, clamp } from "../math.js";
import { oimo } from "../lib/OimoPhysics.js";

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

  printhearts(total, hurt) {
		for (let i = 0; i < Math.max(total, this.hearts.children.length); i++) {
			let h = this.hearts.children[i];
			if (!h) {
				h = document.createElement("pic");
				h.classList.add("heart");
				this.hearts.appendChild(h);
			}
			h.classList[i >= total ? "add" : "remove"]("hidden");
			h.classList[i >= total - hurt ? "add" : "remove"]("disabled");
		}
  }

  dispose() {
    this.playbtn.removeEventListener("click", this._playbtn_click_event);
    this._playbtn_click_event = null;
  }
}

const __SimpleBlockbreakerBrickColors = [
  0x370d6b, 0x9358ff, 0xc0e2d8, 0x07f23e,
];
class SimpleBlockbreakerBrick {
  constructor(body, model) {
    /** @type {oimo.dynamics.rigidbody.RigidBody} */
    this.body = body;
    this.model = model;
    this.hit_timestamp = null;
    this.hitpoints = 3;
  }

  static get_color(hitpoints) {
    return (
      __SimpleBlockbreakerBrickColors[Math.max(0, hitpoints - 1)] ?? 0xff00ff
    );
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
    this.bricks_count = 0;
    this.bricks_total = 0;

    this.config = {
      ball_speed: 20,
      ball_speed_max: 40,
      width: 15,
      height: 25,
      pawnposz: 10,
      pawnwidth: 4,
      respawn_brick_threshold: 1,
    };

    this.score = 0;
    this.fails = 0;
    this.respawn_brick_timestamp = 0;
  }

  startplay() {
    /*
    const v = this.physics.cache.vec3_0;
    v.init(10, 0, 10);
    this.ball_body.setLinearVelocity(v);
		*/

    this.score = 0;
    this.fails = 0;
  }

  run() {
    this.physics = new Physics().run({ fixed_step: true });

    this._create_level_box(this.config.width, this.config.height);
    this._create_bricks(new THREE.Vector3(0, 0, -7), new THREE.Vector2(6, 7));
    this._create_pawn();
    this._spawn_ball();

    return this;
  }

  _spawn_ball() {
    const pos = cache.vec3.v0;
		const size = 0.7;
    const ball = this.physics.create_sphere(
      pos.set(0, 0, this.config.pawnposz - 1.5),
      size,
      RigidBodyType.DYNAMIC,
      {
        restitution: 1,
        density: 0.1,
      },
    );
    this.ball_body = ball;
    const ball_mesh = App.instance.render.utils.spawn_icosphere0(0xffff00, size);
    App.instance.render.scene.add(ball_mesh);
    this.physics.attach(ball, ball_mesh);
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

    const thikness = 10;
    const wallheight = 2;

    /*
    this.physics.utils.create_physics_box(
      pos.set(0, wallheight * 0.5, h * 0.5 + thikness * 0.5),
      size.set(w + thikness, wallheight, thikness),
      RigidBodyType.STATIC,
      opts,
    );
		*/
    this.physics.utils.create_physics_box(
      pos.set(0, wallheight * 0.5, -h * 0.5 - thikness * 0.5),
      size.set(w + thikness * 2, wallheight, thikness),
      RigidBodyType.STATIC,
      opts,
    );
    this.physics.utils.create_physics_box(
      pos.set(w * 0.5 + thikness * 0.5, wallheight * 0.5, 0),
      size.set(thikness, wallheight, h + thikness),
      RigidBodyType.STATIC,
      opts,
    );
    this.physics.utils.create_physics_box(
      pos.set(-w * 0.5 - thikness * 0.5, wallheight * 0.5, 0),
      size.set(thikness, wallheight, h + thikness),
      RigidBodyType.STATIC,
      opts,
    );
  }

  _create_bricks(origin, grid, randompos = 0) {
    this.bricks_total = grid.x * grid.y;
    const BOX_SIZE = cache.vec3.v0.set(2, 0.7, 1);
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

        this._spawn_brick(cache.vec3.v1.set(x1, y1, z1), BOX_SIZE);
      }
    }
  }

  _spawn_brick(pos, size, opts, allowstatic = true) {
    opts = opts ?? {
      restitution: 0.1,
    };
    const hitpoints = Math.round(Math.random() * 3 + 1);
    const dynamic = !allowstatic || hitpoints > 1;
    const type = dynamic ? RigidBodyType.DYNAMIC : RigidBodyType.STATIC;
    const color = SimpleBlockbreakerBrick.get_color(hitpoints);
    const id = this.physics.utils.create_physics_box(
      pos,
      size,
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
    this.bricks_count += 1;

    return brick;
  }

  step(dt) {
    this.physics.step(dt);
    this.update_del_bricks_query();
    this.update_respawn_bricks();
    this.update_ball();
  }

  update_ball() {
    this.update_ball_collisions();
    const vel = this.physics.cache.vec3_0;
    const pos = this.physics.cache.vec3_1;
    this.ball_body.getLinearVelocityTo(vel);
    this.ball_body.getPositionTo(pos);
    const speed = vel.length();
    const vely = vel.y;
    const s = Math.max(speed, this.config.ball_speed);
    vel.normalize().scaleEq(Math.min(this.config.ball_speed_max, s));
    if (vely > 0) {
      vel.y = vely * 0.1;
    }
    this.ball_body.setLinearVelocity(vel);

    if (pos.z > this.config.height) {
      this.ballfail();
    }
  }

  ballfail() {
		this.physics.remove(this.ball_body);
		this._spawn_ball();
    this.fails += 1;
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

    this.score += 1;
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
      this.bricks_count -= 1;
    }
  }

  update_respawn_bricks() {
    if (this.bricks_count >= this.bricks_total) {
      return;
    }
    if (
      Date.now() - this.respawn_brick_timestamp <
      this.config.respawn_brick_threshold * 1e3
    ) {
      return;
    }

    let brick = this._query_respawn_brick;
    const pos = cache.vec3.v0;

    if (!brick) {
      pos.set(0, -10, 0);
      const size = cache.vec3.v1;
      size.set(2, 0.7, 1);

      brick = this._query_respawn_brick = this._spawn_brick(
        pos,
        size,
        null,
        false,
      );
      brick.body.sleep();
    }
    const convex = brick.body.getShapeList().getGeometry();

    const raytranslate = this.physics.cache.vec3_1.init(0, -10, 0);
    const raycast = this.physics.cache.raycast;
    let collided = false;
    raycast.process = (s) => {
      const body = s.getRigidBody();
      if (this.bricks[body.id]) {
        collided = true;
      }
    };

    const transform = this.physics.cache.transform;
    for (let attempts = 0; attempts <= 5; attempts++) {
      collided = false;
      pos.x = (Math.random() - 0.5) * this.config.width * 0.9;
      pos.y = 10;
      pos.z = -4 + (Math.random() - 0.5) * 8;

      const opos = this.physics.cache.vec3_0.init(pos.x, pos.y, pos.z);
      transform.copyFrom(this.physics.cache.transformZero);
      transform.translate(opos);

      this.physics.world.convexCast(convex, transform, raytranslate, raycast);
      if (!collided) {
        brick.body.setPosition(opos);
        brick.body.wakeUp();
        this._query_respawn_brick = null;
        this.respawn_brick_timestamp = Date.now();
        break;
      }
    }
  }

  _create_pawn() {
    const pos = cache.vec3.v0;
    const size = cache.vec3.v1;
    const pawn_root = this.physics.create_box(
      pos.set(0, 0.5, this.config.pawnposz),
      size.set(0.1, 0.1, 0.1),
      RigidBodyType.KINEMATIC,
    );

    const pawn_body_id = this.physics.utils.create_physics_box(
      pos.set(0, 0.5, this.config.pawnposz),
      size.set(this.config.pawnwidth, 1, 1),
      RigidBodyType.DYNAMIC,
      {
        friction: 0,
        restitution: 1,
        ldamping: 10,
        adamping: 10,
      },
    );
    const pawn_body = this.physics.bodylist[pawn_body_id];

    const pawn_spring = this.physics.create_box(
      pos.set(0, 0.5, this.config.pawnposz),
      size.set(0.1, 0.1, 0.1),
      RigidBodyType.KINEMATIC,
    );

    const gopts = this.physics.utils.create_generic_joint(
      pawn_root,
      pawn_body,
      pawn_body.getPosition(),
    );
    gopts.transZSd.setSpring(8.0, 1.0);

    // required to disable wobble
    gopts.transXSd.setSpring(4.0, 1.0);
    gopts.transYSd.setSpring(4.0, 1.0);

    const sjoint = this.physics.utils.create_spherical_joint(
      pawn_spring,
      pawn_body,
      pawn_body.getPosition(),
    );
    sjoint.getSpringDamper().setSpring(16.0, 1.0);

    this.pawn_root = pawn_root;
    this.pawn_spring = pawn_spring;
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

    this.targetpos = new THREE.Vector3();
    this.targetdelta = new THREE.Vector3();
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

    if (this.targetpos.length()) {
      const pawnpos = this.level.physics.cache.vec3_0;
      const targpos = this.level.physics.cache.vec3_1;
      const halfpawnwidth = this.level.config.pawnwidth * 0.5 + 0.5;
      const halflevelwidth = this.level.config.width * 0.5;
      const x = clamp(
        -halflevelwidth + halfpawnwidth,
        halflevelwidth - halfpawnwidth,
        this.targetpos.x,
      );
      targpos.init(x, this.targetpos.y, this.level.config.pawnposz);
      this.level.pawn_root.getPositionTo(pawnpos);
      targpos.subEq(pawnpos).scaleEq(5);
      this.level.pawn_root.setLinearVelocity(targpos);

      pawnpos.z += clamp(-1, 1, this.targetdelta.z);
      this.level.pawn_spring.setPosition(pawnpos);
    }
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

    this.score = 0;
    this.fails = 0;
		this.hearts = 3;
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.scene.step(dt);

    if (this.score != this.scene.level.score) {
      this.score = this.scene.level.score;
      this.session.printscore(this.score);
    }

    if (this.fails != this.scene.level.fails) {
      this.fails = this.scene.level.fails;
			this.session.printhearts(this.hearts, this.fails);
			if (this.fails >= this.hearts) {
				this.endplay();
			}
		}
  }

  run() {
    App.instance.start(this.container.querySelector("render"));
    App.instance.render.get_camera_fov_factor = (w, h) => {
      return Math.max(2, h / w);
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
  input(action, start) {
    if (!start) {
      this.scene.targetdelta.set(0, 0, 0);
    }
  }

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input_analog(x, z, action) {
    if (action === InputAction.action_c) {
      this.scene.targetpos.set(x, 0, z);
    } else if (action === InputAction.action_d) {
      this.scene.targetdelta.set(x, 0, z);
    }
  }

  startplay() {
		this.score = 0;
		this.fails = 0;
    this.scene.startplay();
    this.score = this.scene.level.score;
  }

	endplay() {
		this.session.endplay(this.score);
		this.scene.stop();
		App.instance.render.scene.clear();
    this.scene = new SceneBlockbreaker().run();
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
