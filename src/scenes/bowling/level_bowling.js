import { Physics, RigidBodyType, RigidBody } from "../../physics.js";
import { get_material_blob_a, update_shaders } from "../../vfx/shaders.js";
import * as THREE from "three";
import { Vector3 } from "three";
import Environment1 from "../../tests/environment_1.js";
import Loader from "../../loader.js";
import App from "../../app.js";
import { cache, clamp } from "../../math.js";
import PawnBowlingA from "./pawn_bowling.js";
import PawnBotBowlingA from "./pawn_bot_bowling.js";
import ProjectileBallBowling from "./projectile_ball_bowling.js";
import {
  BOOST_EFFECT_TYPE,
  BOOST_EFFECT_TYPES_LIST,
  BoostPropBowling,
} from "./boost_bowling.js";
import LightsA from "../../lights_a.js";

const LevelBowlingConfig = {
  bots_count: 5,
  map: null,
};

/** @type {LevelBowlingConfig} */
const LevelBowlingConfig_t = Object.setPrototypeOf({}, LevelBowlingConfig);

class LevelBowlingUtils {
  constructor(physics) {
    /** @type {Physics} */
    this._physics = physics;
  }

  static create_mesh_body(physics, mesh, dynamic, opts) {
    const bb = mesh.geometry.boundingBox;
    const size = bb.getSize(cache.vec3.v0);
    const center = bb.getCenter(cache.vec3.v1);
    const pos = mesh.getWorldPosition(cache.vec3.v2);
    pos.add(center);
    const type = dynamic ? RigidBodyType.DYNAMIC : RigidBodyType.STATIC;
    const body = physics.create_box(pos, size, type, opts);

    return body;
  }

  create_mesh_body(mesh, dynamic, opts) {
    return LevelBowlingUtils.create_mesh_body(
      this._physics,
      mesh,
      dynamic,
      opts
    );
  }

  /**
   * @param {THREE.Object3D} scene .
   * @param {boolean} attach attaches mesh to created bodies. Mesh origins has to be centered
   * @param {Object} [opts] .
   * @returns {Array<oimo.dynamics.rigidbody.RigidBody>} created bodies list
   */
  parse_playscene(scene, attach = false, opts) {
    const bodies = [];
    let spawnpoints = null;
    scene.traverse((o) => {
      if (o.name.includes("spawn")) {
        const pos = o.position.clone();
        if (!spawnpoints) {
          spawnpoints = {};
          spawnpoints["all"] = [];
        }

        const match = o.name.match(/spawn-([a-z]+)/);
        if (match) {
          const key = match[1];
          if (!spawnpoints[key]) {
            spawnpoints[key] = [];
          }
          spawnpoints[key].push(pos);
        }
        spawnpoints["all"].push(pos);
      }

      /** @type {THREE.Mesh} */
      const m = /** @type {any} */ (o);
      if (!m.isMesh) {
        return;
      }

      //m.castShadow = true;
      //m.receiveShadow = true;

      if (m.name.includes("hidden")) {
        m.visible = false;
      }

      if (!m.name.includes("phys")) {
        return;
      }

      const dynamic = m.name.includes("dynamic");
      const body = this.create_mesh_body(m, dynamic, opts);
      if (attach || dynamic) {
        this._physics.attach(body, m);
      }

      if (m.name.includes("motor")) {
        this.create_motor(body);
      }

      bodies.push(body);
    });

    return {
      bodies,
      spawnpoints,
    };
  }

  /**
   * @param {number} dt
   * @param {RigidBody} body
   * @param {*} factor
   */
  stabilizate_body(dt, body, factor = 0.2) {
    const physics = this._physics;
    // locks rotation
    //this.pawn_body.setRotationFactor(this._physics.cache.vec3_0.init(0, 0, 0));

    // apply rotation stabilization
    const stabilization = physics.cache.vec3_0;
    const mat = physics.cache.mat3;
    body.getRotationTo(mat);
    const r = mat.toEulerXyz();

    stabilization.init(-r.x, -r.y, -r.z);
    stabilization.scaleEq(factor);
    body.setAngularVelocity(stabilization);
  }

  /**
   * @param {number} dt
   * @param {RigidBody} body
   * @param {*} factor
   */
  stabilizate_body_b(dt, body, factor = 0.2) {
    const physics = this._physics;
    // locks rotation
    //this.pawn_body.setRotationFactor(this._physics.cache.vec3_0.init(0, 0, 0));

    // apply rotation stabilization
    const up = physics.get_body_up_dot(body);
    const stabilization = physics.cache.vec3_0;
    const mat = physics.cache.mat3;
    body.getRotationTo(mat);
    const r = mat.toEulerXyz();
    const mass = body.getMass();

    // torque applied each step - it has to be frame dependent
    const df = dt / 30;
    const f2 = 1;
    // should it be  inverse-square time?
    const s = factor * df * f2;

    stabilization.init(-r.x * s, -r.y * s, -r.z * s);
    //const v = physics.cache.vec3_0;
    //body.getAngularVelocityTo(v);
    stabilization.scaleEq(1 - up);
    stabilization.y = -r.y * s * up;
    stabilization.scaleEq(mass);
    body.applyAngularImpulse(stabilization);
  }

  create_motor(body) {
    const pos = this._physics.cache.vec3_0;
    body.getPositionTo(pos);
    const size = cache.vec3.v0;
    size.set(0.1, 0.1, 0.1);
    const b = this._physics.create_box(pos, size, RigidBodyType.STATIC);
    this._physics.create_joint_motor(b, body, null, null, {
      speed: 5,
      torque: 100,
    });
  }
}

class LevelBowlingMap {
  constructor(physics, utils) {
    /** @type {Physics} */
    this._physics = physics;
    /** @type {LevelBowlingUtils} */
    this._utils = utils;
    /** @type {THREE.Object3D} */
    this.playscene = null;
    /** @type {string} */
    this.scenename = null;

    this.spawnpoints = {};
  }

  create_default_playscene() {
    const pos = new Vector3(0, -1, 0);
    const size = new Vector3(13, 2, 0);
    const type = RigidBodyType.STATIC;
    const opts = { sides: 32 };
    const body = this._physics.create_cylinder(pos, size, type, opts);

    size.set(20, 2, 0);
    let geometry = new THREE.CylinderGeometry(
      size.x,
      size.x,
      size.y,
      opts?.sides ?? 6
    );
    let material = get_material_blob_a(
      Loader.instance.get_texture("tex_noise0.png")
    );

    let mesh = new THREE.Mesh(geometry, material);
    App.instance.render.scene.add(mesh);

    this._physics.attach(body, mesh);
    /** @type {THREE.Mesh} */
    const floor_mesh = mesh;
  }

  /**
   * @param {string?} scene .
   */
  async run(scene) {
    if (!scene) {
      this.create_default_playscene();
    } else {
      await this.open_playscene(scene, false);
    }
  }

  step(dt) {
    update_shaders();
  }

  open_playscene(name, lightmaps = true) {
    const render = App.instance.render;
    this.spawnpoints = {};
    this.scenename = name;

    return new Promise((resolve, reject) => {
      const root_path = `bowling/scenes/${name}/`;
      const load = (config) => {
        this.close_playscene();

        Loader.instance
          .get_gltf(root_path + `scene.glb`)
          .then((gltf) => {
            const scene = gltf.scene;
            render.scene.add(scene);
            this.playscene = scene;
            if (lightmaps) {
              if (config) {
                LightsA.apply_lightmaps(scene, root_path, config);
              }
              LightsA.apply_lightmaps_white(scene);
            }

            const opts = this._utils.parse_playscene(scene);
            for (const k in opts.spawnpoints) {
              this.spawnpoints[k] = Array.from(opts.spawnpoints[k]);
            }

            resolve();
          })
          .catch(reject);
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

  get_rand_spawnpoint(key = "all") {
    if (!this.spawnpoints[key]?.length) {
      const pos = cache.vec3.v0;
      pos.x = (Math.random() - 0.5) * 10;
      pos.y = 10;
      pos.z = (Math.random() - 0.5) * 10;

      return pos;
    }

    return this.spawnpoints[key][
      Math.floor(Math.random() * this.spawnpoints[key].length)
    ];
  }

  close_playscene() {
    this.scenename = null;
    this.playscene?.removeFromParent();
    this.playscene = null;
    this.spawnpoints.length = 0;
  }

  stop() {
    this.close_playscene();
  }
}

class LevelBowlingLogo {
  constructor(physics, utils) {
    /** @type {Physics} */
    this._physics = physics;
    /** @type {LevelBowlingUtils} */
    this._utils = utils;
    /** @type {Array<oimo.dynamics.rigidbody.RigidBody>} */
    this.logo_letters = [];
    /** @type {THREE.Object3D} */
    this.scene = null;
    this.elapsed = 0;
  }
  async run() {
    const render = App.instance.render;

    const gltf = await Loader.instance.get_gltf("bowling/logo.glb");
    const scene = gltf.scene.clone();
    this.scene = scene;
    render.scene.add(scene);
    scene.position.y = 10;
    const opts = this._utils.parse_playscene(scene, true, {
      restitution: 1.2,
      adamping: 3,
      friction: 0.1,
      density: 2,
      ldamping: 0.5,
    });
    const letters = opts.bodies;
    this.logo_letters.splice(0, 0, ...letters);
    for (const i in this.logo_letters) {
      const ll = this.logo_letters[i];
      const p = this._physics.cache.vec3_0;
      ll.getPositionTo(p);
      ll._initial_pos_x = p.x;
      ll._initial_pos_z = p.z;
      p.init(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      ll.setAngularVelocity(p);
    }
  }
  step(dt) {
    this.elapsed += dt;
    // --- write letters
    const letters_stabilizate_delay = 5000;
    if (this.elapsed > letters_stabilizate_delay) {
      const e = this.elapsed - letters_stabilizate_delay;
      const f = Math.min(1, e / 5000) * 0.2;
      for (const i in this.logo_letters) {
        const ll = this.logo_letters[i];
        this._utils.stabilizate_body_b(dt, ll, f);

        const targ_pos = this._physics.cache.vec3_0;
        const curr_pos = this._physics.cache.vec3_1;
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
  }

  stop() {
    this.scene?.removeFromParent();
    this.scene = null;
  }
}

class LevelBowlingA {
  constructor() {
    /** @type {Physics} */
    this.physics = null;
    /** @type {LevelBowlingLogo} */
    this.logo = null;
    /** @type {LevelBowlingMap} */
    this.map = null;
    /** @type {LevelBowlingUtils} */
    this.utils = null;
    /** @type {Environment1} */
    this.environment = null;

    /** @type {PawnBowlingA} */
    this.pawn = null;
    /** @type {Object<string, PawnBowlingA>} */
    this.pawns = {};
    /** @type {Object<string, PawnBotBowlingA>} */
    this.bots = {};
    /** @type {Object<string, ProjectileBallBowling>} */
    this.projectiles = {};
    /** @type {Object<string, BoostPropBowling>} */
    this.boosts = {};

    this.boosts_spawn_timestamp = 0;

    this.guids = 0;
    this.bots_count = 0;
    this.bots_active = true;
    this.physics_active = true;

    /** @type {LevelBowlingConfig} */
    this.config = Object.setPrototypeOf({}, LevelBowlingConfig_t);
  }

  step(dt) {
    if (this.physics_active) {
      this.physics.step(dt);
    }
    this.logo?.step(dt);
    this.map.step(dt);

    for (const k in this.pawns) {
      const pawn = this.pawns[k];
      pawn.step(dt);
    }

    if (this.bots_active) {
      for (const k in this.bots) {
        const bot = this.bots[k];
        bot.step(dt);
      }
    }

    for (const k in this.projectiles) {
      const projectile = this.projectiles[k];
      projectile.step(dt);
    }

    for (const k in this.boosts) {
      const boost = this.boosts[k];
      boost.step(dt);
    }

    this.boosts_spawn_timestamp += dt;
    if (this.boosts_spawn_timestamp > 10000) {
      this.boosts_spawn_timestamp = 0;
      this.create_boost();
    }

    this.step_bodies();

    if (this.bots_count > this.config.bots_count) {
      const bots_keys = Object.keys(this.bots);
      while (bots_keys.length > this.config.bots_count) {
        this.remove_bot(bots_keys.pop());
      }
    } else if (this.bots_count < this.config.bots_count) {
      this.create_bots(this.config.bots_count - this.bots_count);
    }
  }

  async run(opts = { floor: false, map: null, logo: true }) {
    this.environment = new Environment1();
    this.environment.run({
      floor: opts?.floor ?? false,
      csm: false,
      shadows: false,
    });
    App.instance.render.scene.background = new THREE.Color(0x000);
    this.environment.lights.lights.directional.intensity = 2;
    this.environment.lights.lights.ambient.intensity = 1;
    this.environment.lights.lights.hemisphere.intensity = 1;

    this.physics = new Physics().run({ fixed_step: false });

    this.utils = new LevelBowlingUtils(this.physics);
    this.map = new LevelBowlingMap(this.physics, this.utils);

    this.pawn = this.create_pawn(null, null, false);

    await ProjectileBallBowling.preload();
    await this.pawn.load();
    await this.map.run(opts?.map ?? this.config.map);

    if (opts?.logo ?? true) {
      this.logo = new LevelBowlingLogo(this.physics, this.utils);
      await this.logo.run();
    }

    this.create_bots(this.config.bots_count);
  }

  /**
   * @param {Vector3?} position .
   */
  create_pawn(position, pawnclass = PawnBowlingA, load = true, run = true) {
    const id = "p" + this.guids++;
    const pawn = new (pawnclass ?? PawnBowlingA)(id, this);
    if (run) {
      pawn.run();
    }
    this.pawns[id] = pawn;
    if (run && position) {
      pawn.pawn_body.setPosition(
        this.physics.cache.vec3_0.init(position.x, position.y, position.z)
      );
    }
    if (load) {
      pawn.load();
    }
    return pawn;
  }

  remove_pawn(id) {
    const pawn = this.pawns[id];
    if (!pawn) {
      return;
    }

    pawn.stop();
    delete this.pawns[id];
  }

  create_projectile(pawn, direction, scale = 1) {
    const projectile = new ProjectileBallBowling(pawn.id, this).run(
      pawn.pawn_draw._target.position,
      direction,
      scale
    );

    this.projectiles[projectile.body.id] = projectile;
  }

  remove_projectile(id, stop = true) {
    const projectile = this.projectiles[id];
    if (!projectile) {
      return;
    }
    if (stop) {
      projectile.stop();
    }
    delete this.projectiles[id];
  }

  create_boost() {
    const typei = Math.floor(BOOST_EFFECT_TYPES_LIST.length * Math.random());
    const typekey = BOOST_EFFECT_TYPES_LIST[typei];
    const type = BOOST_EFFECT_TYPE[typekey];
    const position = this.map.get_rand_spawnpoint("boost");
    const boost = new BoostPropBowling(type, this).run(position);

    this.boosts[boost.body.id] = boost;
  }

  remove_boost(id, stop = true) {
    const boost = this.boosts[id];
    if (!boost) {
      return;
    }
    if (stop) {
      boost.stop();
    }
    delete this.boosts[id];
  }

  create_bots(count) {
    for (let i = 0; i < count; i++) {
      const pawn = this.create_pawn(null, null, true, false);
      pawn.team = 1;
      pawn.run();
      const p = this.map.get_rand_spawnpoint("pawn");
      pawn.pawn_body.setPosition(this.physics.cache.vec3_0.init(p.x, p.y, p.z));
      const bot = new PawnBotBowlingA(pawn, this);
      bot.run();
      this.bots[pawn.id] = bot;
      this.bots_count += 1;
    }
  }

  remove_bot(id) {
    const bot = this.bots[id];
    bot.stop();
    delete this.bots[id];
    const pawn = this.pawns[id];
    pawn.stop();
    delete this.pawns[id];
    this.bots_count -= 1;
  }

  step_bodies() {
    const now = Date.now();
    for (const i in this.physics.bodylist) {
      const b = this.physics.bodylist[i];

      // respawn
      if (b.getPosition().y <= -10) {
        if (b.temporal) {
          this.physics.remove(b);
          continue;
        }
        const position = this.map.get_rand_spawnpoint("pawn");
        b.setPosition(
          this.physics.cache.vec3_0.init(position.x, position.y, position.z)
        );
      }

      if (b.lifespan && b.timestamp && now - b.timestamp > b.lifespan) {
        this.physics.remove(b);
        continue;
      }
    }
  }

  stop() {
    for (const k in this.pawns) {
      const pawn = this.pawns[k];
      pawn.stop();
      delete this.pawns[k];
    }

    for (const k in this.bots) {
      const bot = this.bots[k];
      bot.stop();
      delete this.bots[k];
    }

    for (const k in this.projectiles) {
      this.remove_projectile(k);
    }

    this.physics.stop();
    this.map.stop();
    this.logo?.stop();

    this.physics = null;
    this.logo = null;
    this.map = null;
    this.utils = null;
    this.environment = null;
  }
}

export default LevelBowlingA;
export { LevelBowlingA, LevelBowlingUtils, LevelBowlingConfig_t };
