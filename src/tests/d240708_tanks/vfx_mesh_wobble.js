import * as THREE from "three";
import { angle_sub, dlerp, dlerp_vec3 } from "../../math.js";
import { Vec3Up, Vec3Right, Vec3Forward } from "./consts.js";

class VfxMeshWobble {
  constructor() {
    /** @type {THREE.Object3D} */
    this._target = null;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.torque = new THREE.Vector3();
    this.rotation = new THREE.Vector3();
    this.impulse = new THREE.Vector3();

    this.cache = {
      v3: new THREE.Vector3(),
      v3_0: new THREE.Vector3(),
      v3_1: new THREE.Vector3(),
    };

    this.max_z = 0;
    this.origins = {};
  }

  step(dt) {
    if (!this._target) {
      return;
    }

    const sdt = dt * 1e-3;

    // --- calc properties

    const velocity = this.cache.v3
      .copy(this._target.position)
      .sub(this.position)
      .applyAxisAngle(Vec3Up, -this._target.rotation.z);

    const acceleration = this.cache.v3_0.copy(velocity).sub(this.velocity);
    acceleration.multiplyScalar(6);

    const impulse = this.cache.v3_1
      .copy(this.impulse)
      .multiplyScalar(6)
      .applyAxisAngle(Vec3Up, -this._target.rotation.z);
    acceleration.add(impulse);

    this.velocity.copy(velocity);
    dlerp_vec3(this.acceleration, acceleration, 0.6, sdt);
    this.position.copy(this._target.position);

    this.torque.copy(this.rotation.sub(this._target.rotation));
    this.rotation.copy(this._target.rotation);

    // --- apply wobble

    this._target.traverse((o) => {
      if (o === this._target) {
        return;
      }

      const origin = this.origins[o.id];
			if (!origin) {
				return;
			}
      const pos = this.cache.v3.copy(origin);

      const f0 = origin.z / this.max_z;

      const rot = this.cache.v3_0.copy(origin);
      rot.x = this.acceleration.y * f0;
      rot.y = -(this.acceleration.x + this.torque.z * 2) * f0;
      //rot.applyAxisAngle(Vec3Up, o.rotation.z);

      pos.applyAxisAngle(Vec3Right, rot.x);
      pos.applyAxisAngle(Vec3Forward, rot.y * 0.3);

      dlerp_vec3(o.position, pos, 1, sdt);

      o.rotation.x = dlerp(o.rotation.x, rot.x, 0.3, sdt);
      o.rotation.y = dlerp(o.rotation.y, rot.y, 0.3, sdt);
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
