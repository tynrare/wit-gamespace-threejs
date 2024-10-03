import { Physics, RigidBodyType } from "../../physics.js";
import { oimo } from "../../lib/OimoPhysics.js";
import { get_material_hza, update_shaders } from "../../vfx/shaders.js";
import * as THREE from "three";
import Loader from "../../loader.js";
import App from "../../app.js";
import PawnBowlingA from "./pawn_bowling.js";
import { LevelBowlingA } from "./level_bowling.js";

/** @enum {string} */
const BOOST_EFFECT_TYPE = {
  SPEED: "SPEED",
  ATTACK: "ATTACK",
  SHIELD: "SHIELD",
};

const BOOST_EFFECT_SHAPE = {
  SPEED: "shape",
  ATTACK: "shape",
  SHIELD: "square",
}

const BOOST_EFFECT_TYPES_LIST = Object.keys(BOOST_EFFECT_TYPE);

const BOOST_EFFECT_TYPE_COLORS = {
  SPEED: new THREE.Color(0xffaa00),
  ATTACK: new THREE.Color(0xff0000),
  SHIELD: new THREE.Color(0x0000ff),
};

const BOOST_EFFECT_TYPE_SPRITES = {
  SPEED: "hourglass",
  ATTACK: "sword",
  SHIELD: "shield",
};

class BoostPropBowling {
  /**
   * @param {BOOST_EFFECT_TYPE} type
   * @param {LevelBowlingA} level
   */
  constructor(type, level, shape = "round") {
    /** @type {LevelBowlingA} */
    this._level = level;
    /** @type {Physics} */
    this._physics = level.physics;
    /** @type {THREE.Mesh} */
    this.mesh = null;
    /** @type {oimo.dynamics.rigidbody.RigidBody} */
    this.body = null;

    this.type = type;

		this.shape = "shape";
  }

  step(dt) {}

  /**
   */
  apply() {
    this.stop();
  }

  run(position) {
		let id = null;
		if (this.shape = "square") {
			const shape = this._physics.cache.vec3_0.init(1, 1, 1);
			id = this._physics.utils.create_physics_box(
				position,
				shape,
				RigidBodyType.DYNAMIC,
				{ friction: 2, restitution: 0.9, density: 2.2, ldamping: 0 },
			);
		} else if (true || this.shape === "shape") {
			const shape = 0.4;
			id = this._physics.utils.create_physics_sphere(
				position,
				shape,
				RigidBodyType.DYNAMIC,
				{ friction: 1, restitution: 2.9, density: 0.2, ldamping: 1 },
			);
		} 

    this.body = this._physics.bodylist[id];
    this.mesh = this._physics.meshlist[id];

    this.body.userData = {
      type_boost: true,
    };

    this.mesh.material = get_material_hza(
      {
        dither: true,
        glow: { glowColor: BOOST_EFFECT_TYPE_COLORS[this.type] },
        noise: true,
      },
      `bboost-${this.type}`,
    );

    this.mesh.material.blendColor = BOOST_EFFECT_TYPE_COLORS[this.type];

    const sprite_texture = Loader.instance.get_texture(
      `pic/${BOOST_EFFECT_TYPE_SPRITES[this.type]}.png`,
    );
    const sprite_material = new THREE.SpriteMaterial({ map: sprite_texture });
    const sprite = new THREE.Sprite(sprite_material);
    this.mesh.add(sprite);
    sprite.scale.setScalar(0.5);

    return this;
  }

  stop() {
    this._level.remove_boost(this.body.id, false);
    if (this.body) {
      this._physics.remove(this.body);
      this.body = null;
    }
    this.mesh?.removeFromParent();
    this.mesh = null;

    this._physics = null;
  }
}

class BoostSquarePropBowling extends BoostPropBowling {
}

class BoostEffectBowling {
  /**
   * @param {string} id
   * @param {BOOST_EFFECT_TYPE} type
   * @param {PawnBowlingA} pawn
   */
  constructor(id, type, pawn) {
    this._pawn = pawn;
    this.id = id;
    this.type = type;

    this.duration = 10000;
    this.elapsed = 0;

    this.pawn_default_materials = {};
  }

  step(dt) {
    this.elapsed += dt;
    switch (this.type) {
      case BOOST_EFFECT_TYPE.ATTACK:
        this._pawn.pawn_behaviour.shoots_spent = 0;
        break;
    }
  }

  apply_material() {
    this._pawn.character_scene.traverse((o) => {
      /** @type {THREE.Mesh} */
      const m = /** @type {any} */ (o);
      if (!m.isMesh) {
        return;
      }

      const dm = m.material;
      this.pawn_default_materials[m.id] = dm;
      m.material = get_material_hza(
        {
          dither: false,
          glow: { glowColor: BOOST_EFFECT_TYPE_COLORS[this.type] },
          noise: false,
        },
        `beboost-${this.type}`,
      );
      m.material.map = dm.map;
    });
  }

  restore_material() {
    this._pawn.character_scene.traverse((o) => {
      const dm = this.pawn_default_materials[o.id];
      if (dm) {
        o.material = dm;
      }
    });
  }

  apply_effects() {
    switch (this.type) {
      case BOOST_EFFECT_TYPE.SPEED:
        this._pawn.pawn_behaviour.timescale = 2;
        break;
      case BOOST_EFFECT_TYPE.SHIELD:
        this._pawn.pawn_behaviour.invulnerable = true;
        this._pawn.pawn_behaviour.config.stabilization_factor =
          Object.getPrototypeOf(this._pawn.pawn_behaviour.config).stabilization_factor * 2;
        this._pawn.body_angular_dumping =
          this._pawn.config.body_angular_dumping * 2;
        this._pawn.pawn_body.setAngularDamping(this._pawn.body_angular_dumping);
        this._pawn.body_linear_damping =
          this._pawn.config.body_linear_damping * 2;
        this._pawn.pawn_body.setLinearDamping(this._pawn.body_linear_damping);
        this._pawn.body_mass = this._pawn.config.body_mass * 2;
        const dm = this._pawn.pawn_body.getMassData();
        dm.mass = this._pawn.body_mass;
        this._pawn.pawn_body.setMassData(dm);
        break;
      case BOOST_EFFECT_TYPE.ATTACK:
        this._pawn.pawn_behaviour.config.projectile_scale =
          Object.getPrototypeOf(this._pawn.pawn_behaviour.config).projectile_scale * 2;
				break;
    }
  }

  restore_effects() {
    switch (this.type) {
      case BOOST_EFFECT_TYPE.SPEED:
        this._pawn.pawn_behaviour.timescale = 1;
        break;
      case BOOST_EFFECT_TYPE.SHIELD:
        this._pawn.pawn_behaviour.invulnerable = false;
        this._pawn.pawn_behaviour.config.stabilization_factor =
          Object.getPrototypeOf(this._pawn.pawn_behaviour.config).stabilization_factor * 1;
        this._pawn.body_angular_dumping =
          this._pawn.config.body_angular_dumping * 1;
        this._pawn.pawn_body.setAngularDamping(this._pawn.body_angular_dumping);
        this._pawn.body_linear_damping =
          this._pawn.config.body_linear_damping * 1;
        this._pawn.pawn_body.setLinearDamping(this._pawn.body_linear_damping);
        this._pawn.body_mass = this._pawn.config.body_mass * 1;
        const dm = this._pawn.pawn_body.getMassData();
        dm.mass = this._pawn.body_mass;
        this._pawn.pawn_body.setMassData(dm);
        break;
      case BOOST_EFFECT_TYPE.ATTACK:
        this._pawn.pawn_behaviour.config.projectile_scale =
          Object.getPrototypeOf(this._pawn.pawn_behaviour.config).projectile_scale * 1;
				break;
    }
  }

  enable() {
    this.apply_material();
    this.apply_effects();
  }

  disable() {
    this.restore_material();
    this.restore_effects();
  }
}

export {
  BoostPropBowling,
  BoostEffectBowling,
	BoostSquarePropBowling,
  BOOST_EFFECT_TYPE,
  BOOST_EFFECT_TYPES_LIST,
	BOOST_EFFECT_SHAPE
};
