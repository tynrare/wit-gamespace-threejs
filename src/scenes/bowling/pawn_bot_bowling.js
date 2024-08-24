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
		this.requested_attack = 1000;
		this.elapsed_attack = 0;
		this.charge_requested = 0;
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
			.copy(pawn.pawn_dbg_mesh.position)
			.sub(closest_enemy.pawn_dbg_mesh.position);

		const targ_dist = 7 + Math.sin(this.elapsed * 1e-3) * 5;
		const dist = dir.length();
		if (dist < targ_dist * 2) {
			dir.negate();
		}
		dir.normalize();
		this.direction.lerp(dir, 1 - Math.pow(0.1, dt));
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
