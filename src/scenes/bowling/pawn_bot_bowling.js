import { cache } from "../../math.js";
import { Vector3 } from "three";

class PawnBotBowlingA {
	/**
	 *
	 * @param {AdTestcaseBowlingPawn} pawn
	 */
	constructor(pawn) {
		/** @type {AdTestcaseBowlingPawn} */
		this._pawn = pawn;

		this.elapsed = 0;
		this.elapsed_attack = 0;
		this.attack_cooldown = 700;
		this.direction = new Vector3();
	}

	step(dt, pawns) {
		this.elapsed_attack += dt;
		this.elapsed += dt;

		const pawn = this._pawn;

		if (pawn.pawn_behaviour.stun) {
			return;
		}

		const closest_enemy = this.find_closest_enemy(pawns);
		if (!closest_enemy) {
			return;
		}

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
}

export default PawnBotBowlingA;
