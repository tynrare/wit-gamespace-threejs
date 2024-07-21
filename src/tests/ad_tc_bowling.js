/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../loader.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { cache } from "../math.js";
import { oimo } from "../lib/OimoPhysics.js";
import { Physics, RigidBodyType } from "../physics.js";
import Environment1 from "./environment_1.js";
import AdTestcaseBowlingPawn from "./ad_tc_bowling_pawn.js";
import { InputAction } from "../pawn/inputs_dualstick.js";

class BowlingPawnBot {
  /**
   *
   * @param {AdTestcaseBowlingPawn} pawn
   */
  constructor(pawn) {
    /** @type {AdTestcaseBowlingPawn} */
    this._pawn = pawn;

    this.elapsed = 0;
    this.requested_attack = 1000;
    this.elapsed_attack = 0;
    this.charge_requested = 0;
    this.direction = new Vector3();
  }

  step(dt) {
    this.elapsed_attack += dt;
    this.elapsed += dt;
  }

  /**
   *
   * @param {Array<AdTestcaseBowlingPawn>} pawns
   */
  find_closest_enemy(pawns) {
    let closest_enemy = null;
    let closest_dist = Infinity;
    for (let i = 0; i < pawns.length; i++) {
      const pawn = pawns[i];
      if (pawn == this._pawn) {
        continue;
      }

      const dist = this._pawn.pawn_dbg_mesh.position.distanceTo(
        pawn.pawn_dbg_mesh.position,
      );
      if (dist < closest_dist) {
        closest_dist = dist;
        closest_enemy = pawn;
      }
    }

    return closest_enemy;
  }

  attacks() {
    return Boolean(this.charge_requested || this.spawn_projectile_requested);
  }
}

/**
 * @class AdTestcaseBowling
 * @memberof Pages/Tests
 */
class AdTestcaseBowling {
  constructor() {
    /** @type {AdTestcaseBowlingPawn} */
    this.pawn = null;

    /** @type {Array<AdTestcaseBowlingPawn>} */
    this.pawns = [];

    /** @type {Array<BowlingPawnBot>} */
    this.bots = [];

    /** @type {Physics} */
    this.physics = null;

    /** @type {THREE.Object3D} */
    this.playscene = null;

    /** @type {Environment1} */
    this.environment = null;

    this.cache = {
      vec3_0: new Vector3(),
    };

    /** @type {string} */
    this.scenename = null;

    /** @type {Array<THREE.Object3D} */
    this.spawnpoints = [];

		this.paused = false;
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    if (this.paused || !this.playscene && this.scenename) {
      return;
    }

    this.physics.step(dt);
    this.step_bots(dt);
    for (let i = 0; i < this.pawns.length; i++) {
      const pawn = this.pawns[i];
      pawn.step(dt);
    }
    this.respawn_bodies();
  }

  respawn_bodies() {
    for (const i in this.physics.bodylist) {
      const b = this.physics.bodylist[i];
      if (b.getPosition().y > -10) {
        continue;
      }
      if (b.temporal) {
        this.physics.remove(b);
        continue;
      }

      const position = this.get_rand_spawnpoint();
      b.setPosition(
        this.physics.cache.vec3_0.init(position.x, position.y, position.z),
      );
    }
  }

  step_bots(dt) {
    const dtt = dt * 1e-3;
    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      bot.step(dt);
      const pawn = bot._pawn;
      if (pawn.stun) {
        continue;
      }

      const closest_enemy = bot.find_closest_enemy(this.pawns);
      if (closest_enemy) {
        const dir = cache.vec3.v0
          .copy(pawn.pawn_dbg_mesh.position)
          .sub(closest_enemy.pawn_dbg_mesh.position);
        const targ_dist = 7 + Math.sin(bot.elapsed * 1e-3) * 5;
        const dist = dir.length();
        if (dist < targ_dist * 2 && !bot.attacks()) {
          dir.negate();
        }
        dir.normalize();
        bot.direction.lerp(dir, 1 - Math.pow(0.1, dtt));

        if (
          bot.elapsed_attack > bot.requested_attack &&
          !bot.charge_requested
        ) {
          bot.charge_requested = Math.random() * 0.5 + 0.5;
        }

        if (bot.charge_requested) {
          pawn.action(InputAction.action_b, true);
          pawn.action_analog(dir.x, dir.z, InputAction.action_b);
          if (bot.charge_requested < pawn.charge) {
            pawn.action(InputAction.action_b, false);
            pawn.action_analog(dir.x, dir.z, InputAction.action_b);
            bot.charge_requested = 0;
            bot.elapsed_attack = 0;
            bot.requested_attack = Math.random() * 5000 + 1000;
          }
        } else if (bot.attacks()) {
          pawn.action(InputAction.action_a, true);
          pawn.action_analog(dir.x, dir.z, InputAction.action_a);
        } else {
          pawn.action(InputAction.action_a, true);
          pawn.action_analog(
            bot.direction.x,
            bot.direction.z,
            InputAction.action_a,
          );
        }
      }
    }
  }

  run(
    onload,
    opts = {
      botclass: AdTestcaseBowlingPawn,
      pawnclass: AdTestcaseBowlingPawn,
      floor: false,
      scene: "b",
      bots: 5,
    },
  ) {
		this.paused = true;
    this.environment = new Environment1();
    this.environment.run({ floor: opts?.floor ?? false });

    this.physics = new Physics().run({ fixed_step: false });
    if (opts?.floor && !opts?.scene) {
      this.physics.create_box(
        new Vector3(0, -1, 0),
        new Vector3(100, 2, 100),
        RigidBodyType.STATIC,
      );
    }

    this.pawn = this.create_pawn(null, opts.pawnclass, false);
    const load = [this.pawn.load()];
    if (opts?.scene) {
      load.push(this.open_playscene(opts?.scene));
    }

    Promise.all(load).then(() => {
			this.paused = false;
      if (onload) {
        onload();
      }
    });

		this.create_bots(opts?.bots ?? 5, opts?.botclass ?? AdTestcaseBowlingPawn);
  }

	create_bots(count, pawnclass) {
    for (let i = 0; i < count; i++) {
      const pawn = this.create_pawn(this.get_rand_spawnpoint(), pawnclass);
      this.bots.push(new BowlingPawnBot(pawn));
      pawn.stun = 5;
    }
	}

  /**
   *
   * @param {Vector3?} position .
   */
  create_pawn(position, pawnclass = AdTestcaseBowlingPawn, load = true) {
    const pawn = new (pawnclass ?? AdTestcaseBowlingPawn)().run(this.physics);
    this.pawns.push(pawn);
    if (position) {
      pawn.pawn_body.setPosition(
        this.physics.cache.vec3_0.init(position.x, position.y, position.z),
      );
    }
    if (load) {
      pawn.load();
    }
    return pawn;
  }

  get_rand_spawnpoint() {
    if (!this.spawnpoints.length) {
      const pos = cache.vec3.v0;
      pos.x = (Math.random() - 0.5) * 25;
      pos.y = 10;
      pos.z = (Math.random() - 0.5) * 25;

      return pos;
    }

    return this.spawnpoints[
      Math.floor(Math.random() * this.spawnpoints.length)
    ];
  }

  open_playscene(name, lightmaps = true) {
    const render = App.instance.render;
    this.spawnpoints.length = 0;
    this.scenename = name;

    return new Promise((resolve, reject) => {
      const root_path = `bowling/scenes/${name}/`;
      const load = (config) => {
        this.close_playscene();

        Loader.instance.get_gltf(root_path + `scene.glb`).then((gltf) => {
          const scene = gltf.scene;
          render.scene.add(scene);
          this.playscene = scene;
          /** @type {THREE.Mesh} */
          if (config) {
            LightsA.apply_lightmaps(scene, root_path, config);
          }
          LightsA.apply_lightmaps_white(scene);

          this.parse_playscene(scene);

          resolve();
        });
      };

      if (lightmaps) {
        Loader.instance
          .get_json(root_path + `lightmaps/config.json`)
          .then((config) => {
            load(config);
          });
      } else {
        load(null);
      }
    });
  }

  close_playscene() {
    this.scenename = null;
    this.playscene?.removeFromParent();
    this.playscene = null;
  }

  /**
   * @param {THREE.Object3D} scene .
   * @param {boolean} attach attaches mesh to created bodies. Mesh origins has to be centered
	 * @param {Object} [opts] .
	 * @returns {Array<oimo.dynamics.rigidbody.RigidBody>} created bodies list
   */
  parse_playscene(scene, attach = false, opts) {
		const bodies = [];
    scene.traverse((o) => {
      if (o.name.includes("spawn")) {
        this.spawnpoints.push(o.position.clone());
      }

      /** @type {THREE.Mesh} */
      const m = /** @type {any} */ (o);
      if (!m.isMesh) {
        return;
      }

      if (!m.name.includes("phys")) {
        return;
      }
      const bb = m.geometry.boundingBox;
      const size = bb.getSize(cache.vec3.v0);
      const center = bb.getCenter(cache.vec3.v1);
      const pos = m.getWorldPosition(cache.vec3.v2);
      pos.add(center);
      const type = m.name.includes("dynamic")
        ? RigidBodyType.DYNAMIC
        : RigidBodyType.STATIC;
      const body = this.physics.create_box(pos, size, type, opts);
      if (attach) {
        this.physics.attach(body, m);
      }

			bodies.push(body);
    });

		return bodies;
  }

  create_material(color) {
    return App.instance.render.utils.create_material0(color);
  }

  /**
   * Creates box with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {number} color .
   * @returns {string} body id
   */
  create_physics_box(pos, size, type, opts, color = 0xffffff) {
    return this.physics.utils.create_physics_box(pos, size, type, null, color);
  }

  /**
   * Creates sphere with mesh
   * @param {Vector3} pos .
   * @param {number} sphere .
   * @param {RigidBodyType} type .
   * @param {object} [opts] .
   * @param {boolean} [opts.icosphere] .
   * @param {number} [color=0xffffff] .
   * @returns {string} body id
   */
  create_physics_sphere(pos, radius, type, opts, color = 0xffffff) {
    return this.physics.utils.create_physics_sphere(
      pos,
      radius,
      type,
      null,
      color,
    );
  }

  /**
   * Creates cylinder with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {object?} [opts] .
   * @param {number} [opts.friction=1] .
   * @param {number} [color] .
   * @returns {string} body id
   */
  create_physics_cylinder(pos, size, type, opts, color = 0xffffff) {
    return this.physics.utils.create_physics_cylinder(
      pos,
      size,
      type,
      null,
      color,
    );
  }

  /**
   *
   * @param {THREE.Vector3} pos .
   */
  utils_create_motors(pos) {
    const size = cache.vec3.v1;
    const _pos = cache.vec3.v2;
    _pos.copy(pos);
    size.set(0.5, 0.5, 0.5);
    const id1 = this.create_physics_box(
      pos,
      size,
      RigidBodyType.STATIC,
      null,
      0x000000,
    );
    _pos.x += 1;
    size.set(2, 0.4, 0.4);
    const id2 = this.create_physics_box(
      _pos,
      size,
      RigidBodyType.DYNAMIC,
      {
        density: 100,
      },
      0xffffff,
    );
    const b1 = this.physics.bodylist[id1];
    const b2 = this.physics.bodylist[id2];
    const motor = this.physics.create_joint_motor(b1, b2, null, null, {
      speed: 5,
      torque: 100,
    });
  }
	
  utils_create_boxes() {
		return AdTestcaseBowling.utils_create_boxes(this.physics);
	}

  static utils_create_boxes(physics) {
    const BOX_SIZE = 1;
    const amount = 4;
    for (let x = 0; x < amount; x++) {
      for (let y = 0; y < amount; y++) {
        let i = x + (amount - 1 - y) * amount;
        let z = 0;
        let x1 = -10 + x * BOX_SIZE * 3 + Math.random() * 0.1;
        let y1 = 10;
        let z1 = 4 + (amount - 1 - y) * BOX_SIZE * 3 + Math.random() * 0.1;
        let w = BOX_SIZE * 1;
        let h = BOX_SIZE * 1;
        let d = BOX_SIZE * 1;
        const dynamic = Math.random() > 0.0;
        const type = dynamic ? RigidBodyType.DYNAMIC : RigidBodyType.STATIC;
        const color = dynamic ? 0xffffff : 0x000000;
				const id = physics.utils.create_physics_box(
          cache.vec3.v0.set(x1, y1, z1),
          cache.vec3.v1.set(w, h, d),
          type,
					null,
          color)
        const body = physics.bodylist[id];
        const vel = physics.cache.vec3_0;
        vel.init(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        );
        body.setAngularVelocity(vel);
      }
    }
  }

  stop() {
    while (this.pawns.length) {
      this.pawns.pop().stop();
    }
    this.bots.length = 0;
    this.spawnpoints.length = 0;
    this.environment.stop();
    this.pawn = null;
    this.environment = null;
    this.close_playscene();
		this.physics.stop();
		this.physics = null;
  }
}

export default AdTestcaseBowling;
