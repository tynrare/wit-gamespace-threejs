/** @namespace PawnControllers */

import * as THREE from "three";
import { Vector2, Vector3 } from "three";
import { Vec3Up, angle_sub } from "./math.js";
import { CameraConfig } from "./config.js";

/**
 * Controls camera.
 *
 * @class CameraTopdown
 * @memberof PawnControllers
 */
class CameraTopdown {
  constructor() {
    /** @type {THREE.Camera} */
    this._camera = null;
    /** @type {THREE.Object3D} */
    this._target = null;

    this._target_lpos = new Vector3();
    this._camera_lpos = new Vector3();

    this.cache = {
      v3: new Vector3(),
    };

    this.config = new CameraConfig();
  }

  step(dt) {
    if (!this._target || !this._camera) {
      return;
    }

    // ---
    // construct local position vector
    const pos = this.cache.v3.set(0, -1, 0);
    pos.normalize().multiplyScalar(this.config.distance);
    pos.z += this.config.height;

		this._target_lpos.lerp(this._target.position, this.config.follow_speed);

		pos.applyAxisAngle(Vec3Up, this.config.rotation);
		pos.add(this._target_lpos);
		this._camera_lpos.lerp(pos, this.config.camera_speed);

    this._camera.position.copy(this._camera_lpos);
    this._camera.up = Vec3Up;

    this._camera.lookAt(this._target.position);
  }

  cleanup() {
    this._camera = null;
    this._target = null;
  }

  /**
   * @param {THREE.Camera} camera .
   */
  set_camera(camera) {
    this._camera = camera;
  }

  /**
   * @param {THREE.Object3D} target .
   */
  set_target(target) {
    this._target = target;
    this._target_lpos.copy(this._target.position);
  }
}

export default CameraTopdown;
