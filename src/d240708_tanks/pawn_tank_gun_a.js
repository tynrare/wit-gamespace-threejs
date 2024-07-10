/** @namespace PawnControllers */

import * as THREE from "three";
import { Vector3 } from "three";
import { InputAction } from "./inputs.js";
import { angle_sub, lerp } from "../math.js";
import { Vec3Up, Vec3Right, Vec3Forward } from "./consts.js";

/**
 * Controls shooting.
 *
 * @class PawnTankGunA
 * @memberof PawnControllers
 */
class PawnTankGunA {
  constructor() {
		this.origin = new Vector3();
		this.direction = new Vector3();

		// dbg
		{
      const geometry = new THREE.SphereGeometry(0.1);
      const material = new THREE.MeshBasicMaterial({
				color: 0xff0000
      });
      this._dbg = new THREE.Mesh(geometry, material);
		}
	}

	step(dt) {
	}

	/**
	 * @param {Vector3} origin
	 * @param {Vector3} direction
	 */
	set_direction(origin, direction) {
		this.origin.copy(origin);
		this.direction.copy(direction);
		this._dbg.position.copy(this.direction).multiplyScalar(3).add(origin);
	}

  /**
   * @param {THREE.Scene} scene .
   */
  set_scene(scene) {
		this.cleanup();
    this._scene = scene;
		this._scene.add(this._dbg);
  }

	cleanup() {
		this._dbg.removeFromParent();
		this._scene = null;
	}
}

export default PawnTankGunA;
