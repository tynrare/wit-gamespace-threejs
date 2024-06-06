import * as THREE from "three";
import { Vec3Up, Vec3Forward, Vec3Right, angle_sub, lerp } from "./math.js";

class VfxMeshWobble {
  constructor() {
    /** @type {THREE.Object3D} */
    this._target = null;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.position = new THREE.Vector3();
		this.torque = new THREE.Vector3();
		this.rotation = new THREE.Vector3();

    this.cache = {
      v3: new THREE.Vector3(),
      v3_0: new THREE.Vector3(),
    };

		this.max_z = 0;
    this.origins = {};
  }

  step(dt) {
    if (!this._target) {
      return;
    }

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

		// --- apply wobble
		
    this._target.traverse((o) => {
      if (o === this._target) {
        return;
      }

      const origin = this.origins[o.id];
      const pos = this.cache.v3.copy(origin);

			const f0 = origin.z / this.max_z;

      const rotx = this.acceleration.y * f0 * 10;
      const roty = (this.acceleration.x - this.torque.z) * f0;

      pos.applyAxisAngle(Vec3Right, rotx);
      pos.applyAxisAngle(Vec3Forward, roty * 0.3);

      o.position.lerp(pos, 0.1);

      o.rotation.x = lerp(o.rotation.x, rotx, 0.3);
      o.rotation.y = lerp(o.rotation.y, roty, 0.3);
    });
  }

  /**
   * @param {THREE.Object3D} target .
   */
  set_target(target) {
    this._target = target;
    this.position.copy(this._target.position);
    this.acceleration.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.origins = {};
		this.max_z = 0;

    target.traverse((o) => {
      this.origins[o.id] = new THREE.Vector3().copy(o.position);
			this.max_z = Math.max(this.max_z, o.position.y);
    });
  }

  cleanup() {
    this._target = null;
		this.max_z = 0;
    this.origins = {};
  }
}

export default VfxMeshWobble;
