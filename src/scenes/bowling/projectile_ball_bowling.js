import { Vector3, Object3D } from "three";
import { cache } from "../../math.js";
import { Physics, RigidBodyType } from "../../physics.js";
import { LevelBowlingA, LevelBowlingUtils } from "./level_bowling.js";
import App from "../../app.js";
import Loader from "../../loader.js";

const FILENAME = "bowling/projectile1.glb";
const FILENAME_VFX_FRACTURED = "bowling/projectile1_fractured.glb";

class ProjectileBallBowling {
	/**
	 * @param {string} ownerid
	 * @param {LevelBowlingA} level
	 */
	constructor(ownerid, level) {
		/** @type {string} */
		this.ownerid = ownerid;
		/** @type {LevelBowlingA} */
		this._level = level;
		/** @type {Physics} */
		this._physics = level.physics;

		this.config = {
			lifespan: 1000,
			impulse: 30
		}

		this.timestamp = 0;

		this.body = null;
		this.mesh = null;
	}

	step(dt) {
		if (Date.now() - this.timestamp > this.config.lifespan) {
			this.crush();
		}
	}

	/**
	 * @param {Vector3} position .
	 * @param {Vector3} direction .
	 */
	run(position, direction) {
		this.timestamp = Date.now();
		const radius = 0.5;
		const pos = cache.vec3.v1;
		const dir = direction;
		pos
			.copy(dir)
			.normalize()
			.setLength(radius * 2)
			.add(position);
		pos.y = 0.5;
		const body = this._physics.create_sphere(
			pos,
			radius,
			RigidBodyType.DYNAMIC,
			{
				density: 10,
				friction: 0.3,
				restitution: 0.7,
			},
		);

		body.temporal = true;
		body.userData = {
			owner: this.ownerid,
			type_projectile: true,
		};

		const sceneref = Loader.instance.cache.gltfs[FILENAME].scene;
		const mesh = sceneref.clone();
		mesh.scale.multiplyScalar(radius * 2);
		mesh.position.copy(pos);
		App.instance.render.scene.add(mesh);
		this._physics.attach(body, mesh);

		const impulse = this._physics.cache.vec3_0;
		impulse.init(dir.x, 0, dir.z);
		impulse.scaleEq(this.config.impulse);
		body.applyLinearImpulse(impulse);

		this.body = body;
		this.mesh = mesh;

		return this;
	}

	crush() {
		const sceneref = Loader.instance.cache.gltfs[FILENAME_VFX_FRACTURED].scene;
		const scene = sceneref.clone();
		scene.position.copy(this.mesh.position);
		App.instance.render.scene.add(scene);
		const fractures = this._level.utils.parse_playscene(scene, true, {
			density: 2,
			friction: 0.3,
			restitution: 0.7,
		});

		const vel = this._physics.cache.vec3_0;
		const ang = this._physics.cache.vec3_1;
		this.body.getLinearVelocityTo(vel);
		this.body.getAngularVelocityTo(ang);
		const timestamp = Date.now();
		for (const i in fractures) {
			const f = fractures[i];
			f.setLinearVelocity(vel);
			f.setAngularVelocity(ang);
			f.temporal = true;
			f.lifespan = 1000;
			f.timestamp = timestamp;
		}
		this.stop();
	}

	static async preload() {
		await Loader.instance.get_gltf(FILENAME);
		await Loader.instance.get_gltf(FILENAME_VFX_FRACTURED);
	}

	stop() {
		this._level.remove_projectile(this.body.id, false);
		if (this.body) {
			this._physics.remove(this.body);
			this.body = null;
		}
		this.mesh?.removeFromParent();
		this.mesh = null;

		this._sceneref = null;
		this._level = null;
		this._physics = null;
	}
}

export default ProjectileBallBowling;
