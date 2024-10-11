import App from "../../app.js";
import * as THREE from "three";
import { lerp } from "../../math.js";
import { createImagePlane } from "../../tests/utils.js";
import { config } from "./index.js";

const botnames = ["Ivan", "Roman", "Andrey", "Anton", "Oleg", "Tim", "Pavel", "Vlad"];
let _pawn_names_iterator = Math.floor(Math.random() * botnames.length);

class PawnVisualsBowlingA {
	/**
	 * @param {PawnBowlingA} pawn
	 */
	constructor(pawn, highlight_tint = 0xffffff) {
		/** @type {PawnBowlingA} */
		this._pawn = pawn;

		/** @type {THREE.Object3D} */
		this.pointer_mesh = null;

		/** @type {THREE.Object3D} */
		this.highlight_mesh = null;

		this.highlight_tint = highlight_tint;

		const txt = botnames[_pawn_names_iterator++ % botnames.length];
		this.name = config.nicknames ? txt : pawn.id;
	}

	step(dt) {
		this.highlight_mesh.position.copy(this._pawn.pawn_dbg_mesh.position);
		
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
		this._create_highlight_mesh();

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

	_create_highlight_mesh() {
		const highlight = createImagePlane("bowling/circle0.png", false, this.highlight_tint);
		this.highlight_mesh = new THREE.Object3D();
		this.highlight_mesh.add(highlight);
		highlight.position.y = -0.2;
		highlight.rotateX(-Math.PI * 0.5);
		App.instance.render.scene.add(this.highlight_mesh);
	}

	stop() {
		this.pointer_mesh.removeFromParent();
		this.pointer_mesh = null;
		this.highlight_mesh.removeFromParent();
		this.highlight_mesh = null;
	}
}

export default PawnVisualsBowlingA;
