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
    const pos = this.cache.v3.set(0, 0, 1);
    pos.normalize().multiplyScalar(this.config.distance);
    pos.y += this.config.height;

    // -- angle
    // modify target rotation based on imput

    // new target angle set to prev angle
    // wich means that rotation stays the same
    let target_angle = this._target_lrot;

		const v = cache.vec3.v0;
		this._target.getWorldDirection(v);
		const curr_tag_rot = Math.atan2(v.x, v.z);

    let rot_speed = this.config.rotation_passive_speed;
    let stick_factor = this.config.stick_passive_factor;
    if (this.config.attach_to_pawn) {
      target_angle = curr_tag_rot;
      if (this.direction.x || this.direction.z) {
        rot_speed = this.config.rotation_active_speed;
        stick_factor = this.config.stick_active_factor;
      }
    } else {
      if (this.direction.z < 0) {
        // movement backwards - no rotation required
        //..
      } else if (this.direction.z > 0) {
        // movement forwards
        target_angle = curr_tag_rot;
        rot_speed = this.config.rotation_active_speed;
      } else if (this.direction.x != 0) {
        // almost impossible with analog input
      } else {
        // no inputs provided - move behind target
        target_angle = curr_tag_rot;
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
    this._target_lrot = this._target.rotation.y;
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
    this.height = 5;
    /**
     * how fast camera follows target
     */
    this.follow_speed = 0.2;
    /**
     * how fast camera rotates durning idle
     */
    this.rotation_passive_speed = 0.1;
    /**
     * how fast camera rotates durning input
     */
    this.rotation_active_speed = 0.06;
    /**
     * actial camera movement speed
     */
    this.camera_speed = 0.07;
    /**
     * scales rotation_speed depends on camera-target radial distance durning idle
     *
     * After input end, if pawn looks directly at camenra:
     * - Value 0.5 - camera quickly turns behind pawn
     * - Value 1 - camera looks at pawn for few secs
     * - Value 2 - camera looks at pawnwithout turning
     * - Value above 2 - camera turns behind pawn really slow
     *
     */
    this.stick_passive_factor = 0.7;
    /**
     * scales rotation_speed depends on camera-target radial distance durning input.
     * Not active while attach_to_pawn==true
     */
    this.stick_active_factor = 2;
    /**
     * Camera always follows pawn.
     * Pawn able to look at camera if disabled;
     */
    this.attach_to_pawn = true;
  }
}

export default CameraThirdPerson;
