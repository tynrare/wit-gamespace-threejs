import { Physics, RigidBodyType } from "../../physics.js";
import PawnDrawA from "./pawn_draw_bowling.js";
import LevelBowlingA from "./level_bowling.js";
import PawnActionsBowlingA from "./pawn_actions_bowling.js";
import { cache } from "../../math.js";
import { Vector3 } from "three";
import Loader from "../../loader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import App from "../../app.js";
import { InputAction } from "../../pawn/inputs_dualstick.js";
import PawnBehaviourBowlingA from "./pawn_behaviour_bowling.js";
import PawnVisualsBowlingA from "./pawn_visuals_bowling.js";

class PawnBowlingA {
	/**
	 * @param {string} id
	 * @param {LevelBowlingA} level
	 */
	constructor(id, level) {
		/** @type {string} */
		this.id = id;
		/** @type {LevelBowlingA} */
		this._level = level;
		/** @type {Physics} */
		this._physics = level.physics;
		/** @type {oimo.dynamics.rigidbody.RigidBody} */
		this.pawn_body = null;
		/** @type {THREE.Mesh} */
		this.pawn_dbg_mesh = null;
		/** @type {PawnDrawA} */
		this.pawn_draw = null;
		/** @type {PawnActionsBowlingA} */
		this.pawn_actions = null;
		/** @type {PawnBehaviourBowlingA} */
		this.pawn_behaviour = null;
		/** @type {PawnVisualsBowlingA} */
		this.pawn_visuals = null;
	}

	step(dt) {
		this.step_pawn_draw(dt);
		this.pawn_actions.step(dt);
		this.pawn_behaviour.step(dt);
		this.pawn_visuals.step(dt);
	}

	/**
	 * @param {InputAction} type .
	 * @param {boolean} start .
	 */
	action(type, start) {
		this.pawn_actions.action(type, start);
	}
	/**
	 * @param {number} x .
	 * @param {number} z .
	 * @param {InputAction} type .
	 */
	action_analog(x, z, type) {
		this.pawn_actions.action_analog(x, z, type);
	}
	step_pawn_draw(dt) {
		// apply decoration mesh rotation
		const shift = cache.vec3.v4.set(0, -0.5, 0);
		shift.applyQuaternion(this.pawn_dbg_mesh.quaternion);
		this.pawn_draw._target.position.copy(this.pawn_dbg_mesh.position);
		this.pawn_draw._target.position.add(shift);
		this.pawn_draw.step(dt);
		// cd: discard pawn rotation and set correct world rotation
		this.pawn_draw._target.quaternion.copy(this.pawn_dbg_mesh.quaternion);
		this.pawn_draw._target.rotateY(this.pawn_draw.rotation);
	}
	async load() {
		await this._load_pawn();
		this._create_pawn_draw();
	}
	run() {
		const id = this._create_phys_body();
		const mesh = this._physics.meshlist[id];
		const body = this._physics.bodylist[id];

		this.pawn_body = body;
		this.pawn_dbg_mesh = mesh;

		this.pawn_actions = new PawnActionsBowlingA(this);
		this.pawn_behaviour = new PawnBehaviourBowlingA(this);
		this.pawn_visuals = new PawnVisualsBowlingA(this).run();

		return this;
	}

	_create_phys_body() {
		const pos = new Vector3(0, 1, 0);
		const size = new Vector3(0.3, 1, 0);
		const id = this._physics.utils.create_physics_cylinder(
			pos,
			size,
			RigidBodyType.DYNAMIC,
			{ friction: 0.1, density: 1, adamping: 5, ldamping: 1 },
			0x48a9b1,
		);

		const body = this._physics.bodylist[id];

		body.userData = {
			type_pawn : true,
		}

		return id;
	}

	async _load_pawn() {
		this.character_gltf = await Loader.instance.get_gltf("bowling/pawn2.glb");
		this.character_scene = SkeletonUtils.clone(this.character_gltf.scene);
	}

	_create_pawn_draw() {
		this.pawn_draw = new PawnDrawA();
		this.pawn_draw.init(this.character_gltf, this.character_scene);
		App.instance.render.scene.add(this.character_scene);
		this.pawn_dbg_mesh.visible = false;
	}

	static stabilizate_body(physics, dt, body, factor = 0.07) {
		PawnBehaviourBowlingA.stabilizate_body(physics, dt, body, factor);
	}

	stop() {
		this.character_scene?.removeFromParent();
		this.pawn_dbg_mesh?.removeFromParent();
		this.pawn_visuals.stop();
		this.character_scene = null;
		this.character_gltf = null;
		this.pawn_dbg_mesh = null;
		this.pawn_draw = null;
	}
}

export default PawnBowlingA;
