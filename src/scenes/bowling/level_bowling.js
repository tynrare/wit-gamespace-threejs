import { Physics, RigidBodyType } from "../../physics.js";
import { get_material_blob_a, update_shaders } from "../../vfx/shaders.js";
import * as THREE from "three";
import { Vector3 } from "three";
import Environment1 from "../../tests/environment_1.js";
import Loader from "../../loader.js";
import App from "../../app.js";
import { cache, clamp } from "../../math.js";
import PawnBowlingA from "./pawn_bowling.js";
import PawnBotBowlingA from "./pawn_bot_bowling.js";
import ProjectileBallBowling from "./projectile_ball_bowling.js";

class LevelBowlingUtils {
	constructor(physics) {
		/** @type {Physics} */
		this._physics = physics;
	}

	static create_mesh_body(physics, mesh, dynamic, opts) {
		const bb = mesh.geometry.boundingBox;
		const size = bb.getSize(cache.vec3.v0);
		const center = bb.getCenter(cache.vec3.v1);
		const pos = mesh.getWorldPosition(cache.vec3.v2);
		pos.add(center);
		const type = dynamic ? RigidBodyType.DYNAMIC : RigidBodyType.STATIC;
		const body = physics.create_box(pos, size, type, opts);

		return body;
	}

	create_mesh_body(mesh, dynamic, opts) {
		return LevelBowlingUtils.create_mesh_body(this._physics, mesh, dynamic, opts);
	}

	/**
	 * @param {THREE.Object3D} scene .
	 * @param {boolean} attach attaches mesh to created bodies. Mesh origins has to be centered
	 * @param {Object} [opts] .
	 * @returns {Array<oimo.dynamics.rigidbody.RigidBody>} created bodies list
	 */
	parse_playscene(scene, attach = false, opts) {
		const bodies = [];
		scene.traverse((o) => {
			if (o.name.includes("spawn")) {
				this.spawnpoints.push(o.position.clone());
			}

			/** @type {THREE.Mesh} */
			const m = /** @type {any} */ (o);
			if (!m.isMesh) {
				return;
			}

			if (!m.name.includes("phys")) {
				return;
			}

			const dynamic = m.name.includes("dynamic");
			const body = this.create_mesh_body(m, dynamic, opts);
			if (attach) {
				this._physics.attach(body, m);
			}

			bodies.push(body);
		});

		return bodies;
	}

	stabilizate_body(dt, body, factor = 0.07) {
		PawnBowlingA.stabilizate_body(this._physics, dt, body, factor);
	}
}

class LevelBowlingMap {
	constructor(physics, utils) {
		/** @type {Physics} */
		this._physics = physics;
		/** @type {LevelBowlingUtils} */
		this._utils = utils;
		/** @type {THREE.Object3D} */
		this.playscene = null;
		/** @type {string} */
		this.scenename = null;

		this.spawnpoints = [];
	}

	create_default_playscene() {
		const pos = new Vector3(0, -1, 0);
		const size = new Vector3(13, 2, 0);
		const type = RigidBodyType.STATIC;
		const opts = { sides: 32 };
		const body = this._physics.create_cylinder(pos, size, type, opts);

		size.set(20, 2, 0);
		let geometry = new THREE.CylinderGeometry(
			size.x,
			size.x,
			size.y,
			opts?.sides ?? 6,
		);
		let material = get_material_blob_a(
			Loader.instance.get_texture("tex_noise0.png"),
		);

		let mesh = new THREE.Mesh(geometry, material);
		App.instance.render.scene.add(mesh);

		this._physics.attach(body, mesh);
		/** @type {THREE.Mesh} */
		const floor_mesh = mesh;
	}

	/**
	 * @param {string?} scene .
	 */
	async run(scene) {
		if (!scene) {
			this.create_default_playscene();
		} else {
			this.open_playscene(scene, false);
		}
	}

	step(dt) {
		update_shaders();
	}

	open_playscene(name, lightmaps = true) {
		const render = App.instance.render;
		this.spawnpoints.length = 0;
		this.scenename = name;

		return new Promise((resolve, reject) => {
			const root_path = `bowling/scenes/${name}/`;
			const load = (config) => {
				this.close_playscene();

				Loader.instance.get_gltf(root_path + `scene.glb`).then((gltf) => {
					const scene = gltf.scene;
					render.scene.add(scene);
					this.playscene = scene;
					/** @type {THREE.Mesh} */
					if (config) {
						LightsA.apply_lightmaps(scene, root_path, config);
					}
					LightsA.apply_lightmaps_white(scene);

					this.parse_playscene(scene);

					resolve();
				});
			};

			if (lightmaps) {
				Loader.instance
					.get_json(root_path + `lightmaps/config.json`)
					.then((config) => {
						load(config);
					});
			} else {
				load(null);
			}
		});
	}

	get_rand_spawnpoint() {
		if (!this.spawnpoints.length) {
			const pos = cache.vec3.v0;
			pos.x = (Math.random() - 0.5) * 10;
			pos.y = 10;
			pos.z = (Math.random() - 0.5) * 10;

			return pos;
		}

		return this.spawnpoints[
			Math.floor(Math.random() * this.spawnpoints.length)
		];
	}

	close_playscene() {
		this.scenename = null;
		this.playscene?.removeFromParent();
		this.playscene = null;
		this.spawnpoints.length = 0;
	}

	stop() {
		this.close_playscene();
	}
}

class LevelBowlingLogo {
	constructor(physics, utils) {
		/** @type {Physics} */
		this._physics = physics;
		/** @type {LevelBowlingUtils} */
		this._utils = utils;
		/** @type {Array<oimo.dynamics.rigidbody.RigidBody>} */
		this.logo_letters = [];
		/** @type {THREE.Object3D} */
		this.scene = null;
		this.elapsed = 0;
	}
	async run() {
		const render = App.instance.render;

		const gltf = await Loader.instance.get_gltf("bowling/logo.glb");
		const scene = gltf.scene.clone();
		this.scene = scene;
		render.scene.add(scene);
		scene.position.y = 10;
		const letters = this._utils.parse_playscene(scene, true, {
			restitution: 1.2,
			adamping: 3,
			friction: 0.1,
			density: 2,
			ldamping: 0.5,
		});
		this.logo_letters.splice(0, 0, ...letters);
		for (const i in this.logo_letters) {
			const ll = this.logo_letters[i];
			const p = this._physics.cache.vec3_0;
			ll.getPositionTo(p);
			ll._initial_pos_x = p.x;
			ll._initial_pos_z = p.z;
			p.init(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
			ll.setAngularVelocity(p);
		}
	}
	step(dt) {
		this.elapsed += dt;
		// --- write letters
		const letters_stabilizate_delay = 5000;
		if (this.elapsed > letters_stabilizate_delay) {
			const e = this.elapsed - letters_stabilizate_delay;
			const f = Math.min(1, e / 5000) * 0.1;
			for (const i in this.logo_letters) {
				const ll = this.logo_letters[i];
				this._utils.stabilizate_body(dt, ll, f);

				const targ_pos = this._physics.cache.vec3_0;
				const curr_pos = this._physics.cache.vec3_1;
				targ_pos.init(ll._initial_pos_x, 0, ll._initial_pos_z);
				ll.getPositionTo(curr_pos);
				targ_pos.subEq(curr_pos);
				const dist = clamp(-1, 1, targ_pos.length());
				targ_pos.normalize().scaleEq(f * 20 * dist);
				ll.applyForceToCenter(targ_pos);

				let shape = ll.getShapeList();
				if (ll.getLinearDamping() != 3.73) {
					ll.setLinearDamping(3.73);
					while (shape) {
						shape.setRestitution(0);
						shape.setFriction(1e-3);
						shape = shape.getNext();
					}
				}
			}
		}
	}

	stop() {
		this.scene?.removeFromParent();
		this.scene = null;
	}
}

class LevelBowlingA {
	constructor() {
		/** @type {Physics} */
		this.physics = null;
		/** @type {LevelBowlingLogo} */
		this.logo = null;
		/** @type {LevelBowlingMap} */
		this.map = null;
		/** @type {LevelBowlingUtils} */
		this.utils = null;
		/** @type {Environment1} */
		this.environment = null;

		/** @type {PawnBowlingA} */
		this.pawn = null;
		/** @type {Object<string, PawnBowlingA>} */
		this.pawns = {};
		/** @type {Object<string, PawnBotBowlingA>} */
		this.bots = {};
		/** @type {Object<string, ProjectileBallBowling>} */
		this.projectiles = {};

		this.guids = 0;
	}

	step(dt) {
		this.physics.step(dt);
		this.logo.step(dt);
		this.map.step(dt);

		for (const k in this.pawns) {
			const pawn = this.pawns[k];
			pawn.step(dt);
		}

		for (const k in this.bots) {
			const bot = this.bots[k];
			bot.step(dt, this.pawns);
		}

		this.step_bodies();
	}

	async run(opts = { floor: false, scene: null }) {
		this.environment = new Environment1();
		this.environment.run({ floor: opts?.floor ?? false });

		this.physics = new Physics().run({ fixed_step: false });

		this.utils = new LevelBowlingUtils(this.physics);
		this.map = new LevelBowlingMap(this.physics, this.utils);
		this.logo = new LevelBowlingLogo(this.physics, this.utils);

		this.pawn = this.create_pawn(null, null, false);

		await ProjectileBallBowling.preload();
		await this.pawn.load();
		await this.map.run(opts?.scene);
		await this.logo.run();

		this.create_bots(5);
	}

	/**
	 * @param {Vector3?} position .
	 */
	create_pawn(position, pawnclass = PawnBowlingA, load = true) {
		const id = "p" + this.guids++;
		const pawn = new (pawnclass ?? PawnBowlingA)(id, this).run();
		this.pawns[id] = pawn;
		if (position) {
			pawn.pawn_body.setPosition(
				this.physics.cache.vec3_0.init(position.x, position.y, position.z),
			);
		}
		if (load) {
			pawn.load();
		}
		return pawn;
	}

	create_projectile(pawn, direction) {
		const projectile = new ProjectileBallBowling(pawn.id, this).run(
			pawn.pawn_draw._target.position,
			direction,
		);

		this.projectiles[projectile.body.id] = projectile;
	}

	create_bots(count) {
		for (let i = 0; i < count; i++) {
			const pawn = this.create_pawn(this.map.get_rand_spawnpoint());
			const bot = new PawnBotBowlingA(pawn);
			bot.run();
			this.bots[pawn.id] = bot;
		}
	}

	step_bodies() {
		const now = Date.now();
		for (const i in this.physics.bodylist) {
			const b = this.physics.bodylist[i];

			// respawn
			if (b.getPosition().y <= -10) {
				if (b.temporal) {
					this.physics.remove(b);
					continue;
				}
				const position = this.map.get_rand_spawnpoint();
				b.setPosition(
					this.physics.cache.vec3_0.init(position.x, position.y, position.z),
				);
			}

			if (b.lifespan && b.timestamp && now - b.timestamp > b.lifespan) {
				this.physics.remove(b);
				continue;
			}

		}
	}

	stop() {
		for (const k in this.pawns) {
			const pawn = this.pawns[k];
			pawn.stop();
			delete this.pawns[k];
		}

		for (const k in this.bots) {
			const pawn = this.bots[k];
			pawn.stop();
			delete this.bots[k];
		}

		for (const k in this.projectiles) {
			const projectile = this.projectiles[k];
			projectile.stop();
			delete this.projectiles[k];
		}

		this.physics.stop();
		this.map.stop();
		this.logo.stop();

		this.physics = null;
		this.logo = null;
		this.map = null;
		this.utils = null;
		this.environment = null;
	}
}

export default LevelBowlingA;
export { LevelBowlingA, LevelBowlingUtils }
