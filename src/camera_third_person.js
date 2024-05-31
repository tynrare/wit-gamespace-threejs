/** @namespace ThirdPersonControllers */

import * as THREE from "three";
import { Vector2, Vector3 } from "three";
import { Vec3Up, angle_sub } from "./math.js";
import { CameraConfig } from "./config.js";

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
    this._target_lrot = 0;
    this._camera_lpos = new Vector3();

    // input pawn direction update required to correct target angles
    this.direction = new Vector2();

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

    // -- angle
    // modify target rotation based on imput

    // new target angle set to prev angle
    // wich means that rotation stays the same
    let target_angle = this._target_lrot;


    let rot_speed = this.config.rotation_passive_speed;
		let stick_factor = this.config.stick_passive_factor;
		if (this.config.attach_to_pawn) {
			target_angle = this._target.rotation.z;
			if (this.direction.x || this.direction.y) {
				rot_speed = this.config.rotation_active_speed;
				stick_factor = this.config.stick_active_factor;
			}
		} else {
			if (this.direction.y < 0) {
				// movement backwards - no rotation required
				//..
			} else if (this.direction.y > 0) {
				// movement forwards
				target_angle = this._target.rotation.z;
				rot_speed = this.config.rotation_active_speed;
			} else if (this.direction.x != 0) {
				// almost impossible with analog input
			} else {
				// no inputs provided - move behind target
				target_angle = this._target.rotation.z;
			}
		}


    const angle_d = angle_sub(this._target_lrot, target_angle);
    const dist_angle_factor = Math.pow(
      1 - Math.abs(angle_d / Math.PI),
      stick_factor,
    );
    this._target_lrot += angle_d * dist_angle_factor * rot_speed;

    pos.applyAxisAngle(Vec3Up, this._target_lrot);

    // ---

    // apply target position
    this._target_lpos.lerp(this._target.position, this.config.follow_speed);
    pos.add(this._target_lpos);

    // apply final lerp
    this._camera_lpos.lerp(pos, this.config.camera_speed);

    this._camera.position.copy(this._camera_lpos);
    this._camera.up = Vec3Up;

    this._camera.lookAt(this._target_lpos);

    // optional: look straight to target
    //this._camera.lookAt(this._target.position);
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
    this._target_lrot = this._target.rotation.z;
  }
}

export default CameraThirdPerson;
