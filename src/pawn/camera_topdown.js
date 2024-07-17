/** @namespace PawnControllers */

import * as THREE from "three";
import { Vector2, Vector3 } from "three";
import { cache, angle_sub, Vec3Up, Vec3Forward } from "../math.js";

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

    this._target_lpos = new Vector3();
    this._camera_lpos = new Vector3();
    this._camera_lrot = 0;

		this.rotation = 0;

    this.cache = {
      v3: new Vector3(),
    };

    this.config = {
      distance: 17,
      /**
       * z height
       */
      height: 19,
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
      camera_speed: 0.1,
    };
		
		this.distance = this.config.distance;
		this.height = this.config.height;
  }

	/**
   * @param {THREE.Camera} camera .
   * @param {THREE.Object3D} target .
	 */
	init(camera, target) {
    this.distance = this.config.distance;
		this.height = this.config.height;
    
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
    pos.normalize().multiplyScalar(this.distance);
    pos.y += this.height;

    this._target_lpos.lerp(this._target.position, this.config.follow_speed);

    pos.applyAxisAngle(Vec3Up, this.config.rotation + this.rotation);
    pos.add(this._target_lpos);
    this._camera_lpos.lerp(pos, this.config.camera_speed);

    this._camera.position.copy(this._camera_lpos);
    this._camera.up = Vec3Up;

    this._camera.lookAt(this._target.position);
  }

  dispose() {
    this._camera = null;
    this._target = null;
  }

	
	zoom(zoomout) {
		if (zoomout) {
		  // hard to determinate stick aim direction with camera rotation
			//this.rotation = Math.atan2(dir.x, dir.z);
			this.distance = this.config.distance * 1.1;
			this.height = this.config.height * 1.5;
			return;
		}

		this.distance = this.config.distance;
		this.height = this.config.height;
		this.rotation = 0;
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
