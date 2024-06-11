/** @namespace Gamespace */
import * as THREE from "three";
import { Vector3 } from "three";
import { v3cache } from "./math.js";
import logger from "./logger.js";

/**
 * @class Projectile
 * @memberof Gamespace
 */
class Projectile {
	/**
		* @param {string} id .
	*/
	constructor(id) {
		/** @type {THREE.Object3D} */
		this.mesh = null; 

		this.id = id;

		this.origin = new Vector3();
		this.direction = new Vector3();

		this.active = false;
		this.alive = false;
		this.elapsed = 0;

		this.lifetime = 10;
		this.speed = 50;
	}

	step(dt) {
		if (!this.active || !this.alive) {
			return;
		}

		this.elapsed += dt;

		if (this.elapsed * 1e-3 > this.lifetime) {
			this.stop();
			return;
		}

		if (!this.mesh) {
			return;
		}

		const dir = v3cache.v_0.copy(this.direction);
		dir.multiplyScalar(dt * 1e-3 * this.speed);
		this.mesh.position.add(dir);
	}

	/**
	 * @param {Vector3} origin
	 * @param {Vector3} direction
	 */
	run(origin, direction) {
		this.origin.copy(origin);
		this.direction.copy(direction);

		const geometry = new THREE.SphereGeometry(0.3);
		const material = new THREE.MeshBasicMaterial({
			color: 0xff0000
		});
		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.position.copy(origin);
		this.mesh.position.z = 1;

		this.active = true;
		this.alive = true;

		return this;
	}

	stop() {
		this.mesh?.removeFromParent();
		this.mesh = null;
		this.alive = false;
		this.active = false;
	}
}

/**
 * @class ProjectilesSystem
 * @memberof Gamespace
 */
class ProjectilesSystem {
  constructor() {
    /** @type {THREE.Scene} */
    this._scene = null;

    /** @type {Object<string, Projectile>} */
		this.projectiles = {}
		this.guids = 0;
	}

	step(dt) {
		for (const k in this.projectiles) {
			const p = this.projectiles[k];
			p.step(dt);

			if (!p.alive) {
				delete this.projectiles[k];
			}
		}
	}

	/**
	 * @param {Vector3} origin
	 * @param {Vector3} direction
	 */
	spawn(origin, direction) {
		logger.log("ProjectilesSystem::spawn");
		const id = "p" + this.guids++;
		const p = new Projectile(id).run(origin, direction);
		this.projectiles[id] = p;
		this._scene.add(p.mesh);
	}

  /**
   * @param {THREE.Scene} scene .
   */
	init(scene) {
		this._scene = scene;

		return this;
	}

  dispose() {
		this._scene = null;
		for (const k in this.projectiles) {
			this.projectiles[k].stop();
			delete this.projectiles[k];
		}
	}
}

export default ProjectilesSystem;


