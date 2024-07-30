/** @namespace ThirdPersonControllers */

import * as THREE from "three";
import { Vector2, Vector3 } from "three";
import { cache, Vec3Up, angle_sub } from "../math.js";

/**
 * Controls camera.
 *
 * @class CameraThirdPerson
 * @memberof ThirdPersonControllers
 */
class CameraThirdPerson {
  constructor() {
    /** @type {THREE.Camera} */
    this._camera = null;
    /** @type {THREE.Object3D} */
    this._target = null;

    this._target_lpos = new Vector3();
    this._camera_lpos = new Vector3();

    this.cache = {
      v3: new Vector3(),
      v3_1: new Vector3(),
      v3_2: new Vector3(),
    };

    this.config = new CameraConfig();
  }

  step(dt) {
    if (!this._target || !this._camera) {
      return;
    }

		const up = this.cache.v3_1.set(0, 1, 0);
		up.applyQuaternion(this._target.quaternion);

    // ---
    // construct local position vector
    const pos = this.cache.v3.set(0, 0, -1);
    pos.normalize().multiplyScalar(this.config.distance);
    pos.y += this.config.height;
		pos.applyQuaternion(this._target.quaternion);

    // -- angle

    // ---

    // apply target position
    this._target_lpos.lerp(this._target.position, this.config.follow_speed);
    pos.add(this._target_lpos);

    // apply final lerp
    this._camera_lpos.lerp(pos, this.config.camera_speed);

    this._camera.position.copy(this._camera_lpos);
    this._camera.up = up;

    this._camera.lookAt(this._target_lpos);
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

/**
 * Camera config for {@link ThirdPersonControllers.CameraThirdPerson}
 *
 * @memberof Config
 */
class CameraConfig {
  constructor() {
    /**
     * x distance to target
     */
    this.distance = 10;
    /**
     * z height
     */
    this.height = 20;
    /**
     * how fast camera follows target
     */
    this.follow_speed = 0.2;
    /**
     * actial camera movement speed
     */
    this.camera_speed = 0.07;
  }
}

export default CameraThirdPerson;
