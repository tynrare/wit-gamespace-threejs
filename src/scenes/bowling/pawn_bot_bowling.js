import { cache, Vec3Up, lerp, clamp } from "../../math.js";
import { Vector3 } from "three";
import PawnBowlingA from "./pawn_bowling.js";
import LevelBowlingA from "./level_bowling.js";

const PawnBotBowlingAConfig = {
  safe_distance_spread: 0.85,
  stupidity_min: 0.3,
  safe_distance: 3,
  safe_distance_spread_speed: 0.0015,
  waving_distance: 3.3,
  attack_distance: 3.9,
  target_switch_cooldown: 1300,
  dodge_awareness: 0.84,
  dodge_awareness_spread: 0.2,
  dodge_awareness_speed: 0.003,
  aim_accuracy: 0.8,
  aim_accuracy_spread: 0.5,
  waving_speed: 0.003,
  attack_cooldown: 1300,
  stupidity_max: 1,
};

const PawnBotBowlingAConfigStupid = Object.setPrototypeOf(
  {
    dodge_awareness: 0.3,
    attack_cooldown: 1700,
    waving_distance: 5,
    safe_distance: 3.5,
    target_switch_cooldown: 1900,
    dodge_awareness_spread: 0.3,
    dodge_awareness_speed: 0.002,
    stupidity_min: 0,
    stupidity_max: 1,
    aim_accuracy: 0.2,
    aim_accuracy_spread: 2,
    waving_speed: 0.0001,
    safe_distance_spread: 0,
    safe_distance_spread_speed: 0.0015,
    attack_distance: 3.9,
  },
  PawnBotBowlingAConfig,
);

/** @type {PawnBotBowlingAConfig} */
const PawnBotBowlingAConfig_t = Object.setPrototypeOf(
  {},
  PawnBotBowlingAConfig,
);

/** @type {PawnBotBowlingAConfig} */
const PawnBotBowlingAConfigStupid_t = Object.setPrototypeOf(
  {},
  PawnBotBowlingAConfigStupid,
);

class PawnBotBowlingA {
  /**
   * @param {PawnBowlingA} pawn
   * @param {LevelBowlingA} level
   */
  constructor(pawn, level) {
    /** @type {PawnBowlingA} */
    this._pawn = pawn;
    /** @type {LevelBowlingA} */
    this._level = level;
    /** @type {Physics} */
    this._physics = level.physics;

    /** @type {PawnBotBowlingAConfig} */
    this.config = Object.setPrototypeOf({}, PawnBotBowlingAConfig_t);
    this.config_stupid = Object.setPrototypeOf(
      {},
      PawnBotBowlingAConfigStupid_t,
    );

    /** @type {PawnBowlingA} */
    this.target_enemy = null;

    this.elapsed = 0;
    this.elapsed_attack = 0;
    this.elapsed_target_switch = 0;
    this.direction = new Vector3();

    this.stupidity = 1 - Math.random() * Math.random();
  }

  run() {
    this.elapsed_attack = Math.random() * -5000 - 1000;
  }

  get_config_value(key, stupidity = this.stupidity) {
    const s = clamp(
      this.config.stupidity_min,
      this.config.stupidity_max,
      stupidity,
    );
    const v1 = this.config[key];
    const v2 = this.config_stupid[key];

    return lerp(v1, v2 ?? v1, s);
  }

  step(dt) {
    this.elapsed_attack += dt;
    this.elapsed += dt;
    this.elapsed_target_switch += dt;

    const pawn = this._pawn;

    if (pawn.pawn_behaviour.stun) {
      return;
    }

    this.direction.setScalar(0);

    // a. doodge
    const projectiles = this._level.projectiles;
    const closest_projectile = this.find_closest(projectiles, (o) => {
      return o.mesh.position;
    });

    if (closest_projectile) {
      const cp = closest_projectile;
      const vel = cache.vec3.v0;
      const dir = cache.vec3.v1;
      const pvel = this._physics.cache.vec3_0;
      cp.body.getLinearVelocityTo(pvel);
      vel.set(pvel.x, pvel.y, pvel.z);
      dir.copy(this._pawn.pawn_dbg_mesh.position).sub(cp.mesh.position);

      vel.normalize();
      dir.normalize();
      const dot = vel.dot(dir);

      const awareness =
        this.get_config_value("dodge_awareness") +
        Math.sin(
          this.elapsed * this.get_config_value("dodge_awareness_speed"),
        ) *
          this.get_config_value("dodge_awareness_spread");

      if (dot >= 1 - awareness * 0.2) {
        vel.sub(dir);
        dir.cross(Vec3Up).normalize();
        if (vel.dot(dir) > 0) {
          dir.negate();
        }
        this.direction.copy(dir);

        pawn.pawn_actions.action_move(this.direction.x, this.direction.z);
        return;
      }
    }

    // b. hunt

    const pawns = this._level.pawns;
    /** @type {PawnBowlingA} */
    if (this.target_enemy?.disposed) {
      this.target_enemy = null;
    }
    let closest_enemy = this.target_enemy;
    if (
      !closest_enemy ||
      this.elapsed_target_switch >
        this.get_config_value("target_switch_cooldown")
    ) {
      closest_enemy = this.find_closest_enemy(pawns);
      if (this.target_enemy != closest_enemy) {
        this.elapsed_target_switch = 0;
        this.target_enemy = closest_enemy;
      }
    }
    if (closest_enemy) {
      const ce = closest_enemy;

      // point at safe distance
      let safe_distance =
        this.get_config_value("safe_distance") +
        Math.sin(
          this.elapsed * this.get_config_value("safe_distance_spread_speed"),
        ) *
          this.get_config_value("safe_distance_spread");

      // move away when shoots or hearts spent
      safe_distance += this._pawn.pawn_behaviour.shoots_spent_f * 2;
      safe_distance += this._pawn.pawn_behaviour.hearts_spent_f * 4;

      const targ = cache.vec3.v0;
      const len = cache.vec3.v1;
      len.copy(this._pawn.position).sub(ce.position);
      targ.copy(len);
      targ.normalize().multiplyScalar(safe_distance);
      targ.add(ce.position);

      // shifting point with sin
      const wavedir = cache.vec3.v2;
      wavedir.copy(len).cross(Vec3Up).normalize();
      wavedir.multiplyScalar(
        Math.sin(this.elapsed * this.get_config_value("waving_speed")) *
          this.get_config_value("waving_distance"),
      );

      targ.add(wavedir);

      const dir = cache.vec3.v4;
      dir.copy(targ).sub(this._pawn.position);
      const dist = Math.min(dir.length(), 1);
      dir.normalize().multiplyScalar(dist);

      const shoot =
        this.elapsed_attack >= this.get_config_value("attack_cooldown") &&
        len.length() <= this.get_config_value("attack_distance");

      if (shoot) {
        dir.copy(len).normalize().negate();
        const shoot_spread =
          (Math.random() - 0.5) * (1 - this.get_config_value("aim_accuracy"));
        dir.applyAxisAngle(
          Vec3Up,
          shoot_spread * this.get_config_value("aim_accuracy_spread"),
        );
        pawn.pawn_actions.action_aim(dir.x, dir.z);
        pawn.pawn_actions.action_shoot();
        pawn.pawn_actions.action_aim(0, 0);
        this.elapsed_attack = 0;
      } else {
        this.direction.copy(dir);
        pawn.pawn_actions.action_move(this.direction.x, this.direction.z);
      }

      return;
    }
  }

  find_closest(list, getpos, getvalid) {
    let closest = null;
    let closest_dist = Infinity;
    for (const k in list) {
      const o = list[k];
      if (o == this._pawn || (getvalid && !getvalid(o))) {
        continue;
      }

      const dist = this._pawn.pawn_dbg_mesh.position.distanceTo(getpos(o));
      if (dist < closest_dist) {
        closest_dist = dist;
        closest = o;
      }
    }

    return closest;
  }

  /**
   * @param {Object<string, any>} pawns
   */
  find_closest_enemy(pawns) {
    return this.find_closest(pawns, (p) => {
      return p.pawn_dbg_mesh.position;
    }, (p) => {
      return !p.pawn_behaviour.dead;
    });
  }

  stop() {
    this._pawn = null;
    this._level = null;
    this._physics = null;
  }

  pattern_a(dt, pawns) {
    const dir = cache.vec3.v0
      .copy(closest_enemy.pawn_dbg_mesh.position)
      .sub(pawn.pawn_dbg_mesh.position);

    const dist = dir.length();
    dir.normalize();

    const shoot =
      this.elapsed_attack >= this.get_config_value("attack_cooldown");

    if (shoot) {
      pawn.pawn_actions.action_aim(dir.x, dir.z);
      pawn.pawn_actions.action_shoot();
      pawn.pawn_actions.action_aim(0, 0);
      this.elapsed_attack = 0;
    } else {
      const targ_dist = 7 + Math.sin(this.elapsed * 1e-3) * 5;
      if (dist < targ_dist * 2) {
        dir.negate();
      }
      this.direction.lerp(dir, 1 - Math.pow(0.1, dt));

      pawn.pawn_actions.action_move(this.direction.x, this.direction.z);
    }
  }
}

export default PawnBotBowlingA;
export {
  PawnBotBowlingA,
  PawnBotBowlingAConfig_t,
  PawnBotBowlingAConfigStupid_t,
};
