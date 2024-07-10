import * as THREE from "three";
import { angle_sub, lerp } from "../math.js";
import { Vec3Up, Vec3Right, Vec3Forward } from "./consts.js";

class VfxPawnTankA {
  constructor() {
    /** @type {THREE.Object3D} */
    this._target = null;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.position = new THREE.Vector3();
		this.torque = new THREE.Vector3();
		this.rotation = new THREE.Vector3();
		this.wheel_rotation = 0;
    this.look_direction = new THREE.Vector3();

    this.cache = {
      v3: new THREE.Vector3(),
      v3_0: new THREE.Vector3(),
    };
		this.wheels = [];
    /** @type {THREE.Object3D} */
		this.tower = null;
  }

  step(dt) {
    if (!this._target) {
      return;
    }

    const df = dt / 30;

		// --- calc properties
    const velocity = this.cache.v3
      .copy(this._target.position)
      .sub(this.position)
      .applyAxisAngle(Vec3Up, -this._target.rotation.z);

    const acceleration = this.cache.v3_0.copy(velocity).sub(this.velocity);

    this.velocity.copy(velocity);
    this.acceleration.lerp(acceleration, 0.1);
    this.position.copy(this._target.position);

		this.torque.copy(this.rotation.sub(this._target.rotation));
		this.rotation.copy(this._target.rotation);

		// wheels rotation
		this.wheel_rotation -= this.velocity.y * 2; 
		for(const i in this.wheels) {
			const wheel = this.wheels[i];
			wheel.rotation.x = this.wheel_rotation;
		}

		// tower rotation
		let input_direction = this.cache.v3.copy(this.look_direction).normalize();
		let rotate = 0;
		if (input_direction.length()) {
			const direction_angle = Math.atan2(
				-input_direction.x,
				input_direction.y,
			);

      rotate =
        angle_sub(this.tower.rotation.z, direction_angle) * df;
		}
		this.tower.rotation.z += rotate 
  }

	look_at(x, y) {
		this.look_direction.x = x;
		this.look_direction.y = y;
	}

  /**
   * @param {THREE.Object3D} target .
   */
  set_target(target) {
		this.cleanup();
    this._target = target;
    this.position.copy(this._target.position);
		this.wheels.push(
			target.getObjectByName("Koleso_left_back"),
			target.getObjectByName("Koleso_left_front"),
			target.getObjectByName("Koleso_right_back"),
			target.getObjectByName("Koleso_right_front"),
		);

		this.tower = target.getObjectByName("Tank_verh");
  }

  cleanup() {
    this._target = null;
		this.wheel_rotation = 0;
		this.wheels.length = null;
		this.tower = null;
    this.acceleration.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.position.set(0, 0, 0);
  }
}

export default VfxPawnTankA;
