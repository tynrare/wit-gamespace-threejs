import App from "../../app.js";
import * as THREE from "three";
import { lerp } from "../../math.js";
import { createImagePlane } from "../../tests/utils.js";

class PawnVisualsBowlingA {
	/**
	 * @param {PawnBowlingA} pawn
	 */
	constructor(pawn) {
		/** @type {PawnBowlingA} */
		this._pawn = pawn;

		/** @type {THREE.Object3D} */
		this.pointer_mesh = null;
	}

	step(dt) {
		this.pointer_mesh.position.copy(this._pawn.pawn_dbg_mesh.position);
		const direction = this._pawn.pawn_draw.direction;

		const pb = this._pawn.pawn_behaviour;
		if (pb.aims) {
			const rotation = Math.atan2(direction.x, direction.z);
			this.pointer_mesh.rotation.y = rotation - Math.PI * 0.5;
		}
		const scale = pb.aims ? 3 : 0;
		this.pointer_mesh.scale.x = lerp(this.pointer_mesh.scale.x, scale, 0.8);
	}

	run() {
		this._create_pointer_mesh();

		return this;
	}

	_create_pointer_mesh() {
		const arrow = createImagePlane("bowling/arrow0.png");
		this.pointer_mesh = new THREE.Object3D();
		this.pointer_mesh.add(arrow);
		this.pointer_mesh.position.y = 0.3;
		arrow.position.x = 0.5;
		arrow.position.y = -0.2;
		arrow.rotateX(-Math.PI * 0.5);
		arrow.rotateZ(-Math.PI * 0.5);
		App.instance.render.scene.add(this.pointer_mesh);
	}

	stop() {
		this.pointer_mesh.removeFromParent();
		this.pointer_mesh = null;
	}
}

export default PawnVisualsBowlingA;
