import { cache, Vec3Up } from "../../math.js";
import { Vector3 } from "three";
import PawnBowlingA from "./pawn_bowling.js";
import LevelBowlingA from "./level_bowling.js";

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


		this.elapsed = 0;
		this.elapsed_attack = 0;
		this.attack_cooldown = 700;
		this.direction = new Vector3();
	}

	run() {
		this.elapsed_attack = Math.random() * -10000 - 1000;
	}

	step(dt) {
		this.elapsed_attack += dt;
		this.elapsed += dt;

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

			if (dot >= 0.8) {
				vel.sub(dir);
				dir.cross(Vec3Up).normalize();
				if (vel.dot(dir) > 0) {
					dir.negate();
				}
				this.direction.copy(dir);
			} 


			pawn.pawn_actions.action_move(this.direction.x, this.direction.z);
			return;
		}

		const pawns = this._level.pawns;
		const closest_enemy = this.find_closest_enemy(pawns);
		if (closest_enemy) {

			pawn.pawn_actions.action_move(this.direction.x, this.direction.z);
			return;
		}
	}

	find_closest(list, getpos) {
		let closest = null;
		let closest_dist = Infinity;
		for (const k in list) {
			const o = list[k];
			if (o == this._pawn) {
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

		const shoot = this.elapsed_attack >= this.attack_cooldown;

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
