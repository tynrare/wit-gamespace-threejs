/** @namespace PawnControllers */

import * as THREE from "three";
import { Box3, Vector3 } from "three";
import { cache, angle_sub, Vec3Up, Vec3Forward } from "../math.js";

const CameraTopdownConfig = {
  distance: 16,
  /**
   * z height
   */
  height: 16,
  /**
   * rotation
   */
  rotation: 0,
  /**
   * how fast camera follows target
   */
  follow_speed: 0.1,
  /**
   * actial camera movement speed
   */
  camera_speed: 0.5,
}

/** @type {CameraTopdownConfig} */
const CameraTopdownConfig_t = Object.setPrototypeOf({}, CameraTopdownConfig);

/**
 * Controls camera.
 *
 * @memberof PawnControllers
 */
class CameraTopdown {
  constructor() {
    /** @type {THREE.Camera} */
    this._camera = null;
    /** @type {THREE.Object3D} */
    this._target = null;

		this.shift = new Vector3();

    this._target_lpos = new Vector3();
    this._camera_lpos = new Vector3();
    this._camera_lrot = 0;

		this.rotation = 0;

    this.cache = {
      v3: new Vector3(),
    };

    this.config = Object.setPrototypeOf({}, CameraTopdownConfig_t);
		
    this.zoomout = false;

    /** @type {Box3} */
    this.bounds = null;
  }

  /**
  * @param {Vector3} min .
  * @param {Vector3} max .
  */
  set_bounds(min, max) {
      this.bounds = new Box3();
      this.bounds.set(min, max);
  }

	/**
   * @param {THREE.Camera} camera .
   * @param {THREE.Object3D} target .
	 */
	init(camera, target) {
		this.set_camera(camera);
		this.set_target(target);
	}

  step(dt) {
    if (!this._target || !this._camera) {
      return;
    }

    const df = dt / 30;

    // ---
    // construct local position vector
    const pos = this.cache.v3.copy(Vec3Forward);
    pos.normalize().multiplyScalar(this.config.distance);
    pos.y += this.config.height;
		pos.add(this.shift);

    this._target_lpos.lerp(this._target.position, this.config.follow_speed);

    pos.applyAxisAngle(Vec3Up, this.config.rotation + this.rotation);
    pos.add(this._target_lpos);
    if (this.bounds) {
      pos.clamp(this.bounds.min, this.bounds.max);
    }
    this._camera_lpos.lerp(pos, this.config.camera_speed);

    this._camera.position.copy(this._camera_lpos);
    this._camera.up = Vec3Up;

		pos.copy(this._target.position);
		pos.add(this.shift);
    this._camera.lookAt(pos);
  }

  dispose() {
    this._camera = null;
    this._target = null;
  }

	
	zoom(zoomout) {
    this.zoomout = zoomout;
	}

  /**
   * @param {THREE.Camera} camera .
   */
  set_camera(camera) {
    this._camera = camera;
		this._camera_lpos.copy(camera.position);
		/*
    const v = cache.vec3.v0;
    camera.getWorldDirection(v);
    const camera_rot = Math.atan2(-v.x, -v.z);
		this.rotation = camera_rot;
		*/
  }

  /**
   * @param {THREE.Object3D} target .
   */
  set_target(target) {
    this._target = target;
    this._target_lpos.copy(this._target.position);
		this.shift.setScalar(0);
  }
}

export default CameraTopdown;
export { CameraTopdown, CameraTopdownConfig_t }
