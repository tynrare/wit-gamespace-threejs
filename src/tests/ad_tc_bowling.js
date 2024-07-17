/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../loader.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { cache } from "../math.js";
import { Physics, RigidBodyType } from "../physics.js";
import Environment1 from "./environment_1.js";
import AdTestcaseBowlingPawn from "./ad_tc_bowling_pawn.js"
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

      const dist = this._pawn.pawn_dbg_mesh.position.distanceTo(pawn.pawn_dbg_mesh.position);
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


    /** @type {Array<THREE.Object3D} */
    this.spawnpoints = [];
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    if(!this.playscene) {
      return
    };

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
      b.setPosition(this.physics.cache.vec3_0.init(position.x, position.y, position.z))
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
        const dir = cache.vec3.v0.copy(pawn.pawn_dbg_mesh.position).sub(closest_enemy.pawn_dbg_mesh.position);
        const targ_dist = 7 + Math.sin(bot.elapsed * 1e-3) * 5;
        const dist = dir.length();
        if (dist < targ_dist * 2 && !bot.attacks()) {
          dir.negate();
        }
        dir.normalize();
        bot.direction.lerp(dir, 1 - Math.pow(0.1, dtt));

        if (bot.elapsed_attack > bot.requested_attack && !bot.charge_requested) {
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
          pawn.action_analog(bot.direction.x, bot.direction.z, InputAction.action_a);
        }
      }

    }
  }

  run(onload) {
    this.environment = new Environment1();
    this.environment.run({ floor: false });

    this.physics = new Physics().run({ fixed_step: false });
    /*
    this.physics.create_box(
      new Vector3(0, -1, 0),
      new Vector3(100, 2, 100),
      RigidBodyType.STATIC,
    );
    */

    this.pawn = this.create_pawn(null, false);
    Promise.all([
      this.pawn.load(),
      this.open_playscene("b"),
    ]).then(() => {
      if (onload) {
        onload();
      }
    });

    const bots_count = 5;
    for (let i = 0; i < bots_count; i++) {
      const pawn = this.create_pawn(this.get_rand_spawnpoint());
      this.bots.push(new BowlingPawnBot(pawn));
      pawn.stun = 5;
    }
  }

  /**
   * 
   * @param {Vector3?} position .
   */
  create_pawn(position, load = true) {
    const pawn = new AdTestcaseBowlingPawn().run(this.physics);
    this.pawns.push(pawn);
    if (position) {
      pawn.pawn_body.setPosition(this.physics.cache.vec3_0.init(position.x, position.y, position.z));
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

    return this.spawnpoints[Math.floor(Math.random() * this.spawnpoints.length)];
  }

  open_playscene(name, lightmaps = true) {
    const render = App.instance.render;
    this.spawnpoints.length = 0;

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
    this.navmesh?.dispose();
    this.playscene?.removeFromParent();
    this.playscene = null;
  }

  /**
   * @param {THREE.Object3D} scene .
   */
  parse_playscene(scene) {
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
      const body = this.physics.create_box(pos, size, type);
      //this.physics.attach(body, m);
    });
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
  create_physics_box(pos, size, type, color = 0xffffff) {
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
    return this.physics.utils.create_physics_sphere(pos, radius, type, null, color);
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
    return this.physics.utils.create_physics_cylinder(pos, size, type, null, color);
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
  }
}

export default AdTestcaseBowling;
