import { InputAction } from "../../pawn/inputs_dualstick.js";
import PawnBowlingA from "./pawn_bowling.js";

class PawnActionsBowlingA {
  /**
   * @param {PawnBowlingA} pawn
   */
  constructor(pawn) {
    /** @param {PawnBowlingA} */
    this._pawn = pawn;

		this.aims = false;
		this.moves = false;
  }

	step(dt) {
	}


  /**
   * @param {InputAction} type .
   * @param {boolean} start .
   */
  action(type, start) {
		if (type == InputAction.action_b && !start) {
			this.action_shoot();
		}
	}
  /**
   * @param {number} x .
   * @param {number} z .
   * @param {InputAction} type .
   */
  action_analog(x, z, type) {
    switch (type) {
      case InputAction.action_a:
        this.action_move(x, z);
        break;
      case InputAction.action_b:
        this.action_aim(x, z);
        break;
    }
  }

  action_move(x, z) {
		this.moves = Boolean(x && z);
		this._pawn.pawn_behaviour.move(x, z);
  }

  action_aim(x, z) {
		this.aims = Boolean(x && z);
		this._pawn.pawn_behaviour.aim(x, z);
  }

  action_shoot() {
		if (!this._pawn.pawn_draw.direction.length()) {
			return;
		}
		this._pawn.pawn_behaviour.shoot();
	}

}

export default PawnActionsBowlingA;
