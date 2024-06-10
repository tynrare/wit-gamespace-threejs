/** @namespace PawnControllers */

import * as THREE from "three";
import { Vector3 } from "three";
import { InputAction } from "./inputs.js";
import { Vec3Up, Vec3Forward, angle_sub, lerp } from "./math.js";
import { PawnConfig } from "./config.js";
import VfxMeshWobble from "./vfx_mesh_wobble.js";
import VfxPawnTankA from "./vfx_pawn_tank_a.js";

/**
 * Controls pawn.
 *
 * @class PawnTankA
 * @memberof PawnControllers
 */
class PawnTankA {
  constructor() {
    /** @type {THREE.Camera} */
    this._camera = null;
    /** @type {THREE.Object3D} */
    this._target = null;
    /** @type {VfxMeshWobble} */
    this.vfx_mesh_wobble = new VfxMeshWobble();
    /** @type {VfxPawnTankA} */
    this.vfx_pawn_tank = new VfxPawnTankA();

    this.direction = new THREE.Vector3();

    this.lacceleration = 0;

    this.cache = {
      v3: new Vector3(),
      v3_0: new Vector3(),
    };

    this.config = new PawnConfig();
  }

  step(dt) {
    if (!this._target || !this._camera) {
      return;
    }

    const df = dt / 30;

    const facing_direction = this.cache.v3_0
      .copy(Vec3Forward)
      .applyAxisAngle(Vec3Up, this._target.rotation.z);

    let accelerate = this.direction.length() * df;
    let rotate = 0;

    if (accelerate > 0) {
      let input_direction = this.cache.v3.copy(this.direction).normalize();
      input_direction.applyAxisAngle(Vec3Up, this._camera.rotation.z);

      const direction_d = facing_direction.dot(input_direction);

      // allows backward movement. But does not work smooth enough
      // "direction dot sign"
      // also added lacceleration factor - if in movin forwads
      // thiere is less chance to trigger backward movement
      const dds = Math.sign(direction_d + this.lacceleration);
      //const dds = 1;

      const direction_angle = Math.atan2(
        -input_direction.x * dds,
        input_direction.y * dds,
      );

      rotate =
        angle_sub(this._target.rotation.z, direction_angle) *
        this.config.rotation_speed *
        accelerate;

      accelerate *= dds;
    }

    // rotate
    this._target.rotation.z += rotate;

    // move
    this.lacceleration = lerp(
      this.lacceleration,
      accelerate,
      this.config.acceleration_factor,
    );
    const speed = this.lacceleration * this.config.movement_speed;

    facing_direction.multiplyScalar(speed);

    this._target.position.add(facing_direction);

    this.vfx_mesh_wobble.step(dt);
    this.vfx_pawn_tank.step(dt);
  }

  /**
   * keyboard inpull all f*ckt up right now cause
   * lots of camera properties.
   * it should emulate analog input with lerps
   * and stuff.
   *
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input(action, start) {
    let axis = null;
    let factor = null;

    switch (action) {
      case InputAction.left:
        axis = "x";
        factor = start ? 1 : 0;
        break;
      case InputAction.right:
        axis = "x";
        factor = start ? -1 : 0;
        break;
      case InputAction.up:
        axis = "y";
        factor = start ? 1 : 0;
        break;
      case InputAction.down:
        axis = "y";
        factor = start ? -1 : 0;
        break;
    }

    if (factor !== null && axis !== null) {
      const direction = { x: this.direction.x, y: this.direction.y };
      direction[axis] = factor;
      this.input_analog(direction.x, direction.y, "movement");
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} tag
   */
  input_analog(x, y, tag) {
    switch (tag) {
      case "movement":
        const fx = Math.abs(y * this.config.steer_threshold);
        const nx = Math.max(0, Math.abs(x) - fx) * Math.sin(x);
        this.direction.x = -nx;
        this.direction.y = y;
        break;
      case "attack":
				let input_direction = this.cache.v3.set(-x, y, 0).normalize();
				input_direction.applyAxisAngle(Vec3Up, this._camera.rotation.z);
				input_direction.applyAxisAngle(Vec3Up, -this._target.rotation.z);
				this.vfx_pawn_tank.look_at(input_direction.x, input_direction.y);
        break;
    }
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
    this.vfx_mesh_wobble.set_target(target);
    this.vfx_pawn_tank.set_target(target);
  }

  cleanup() {
    this._camera = null;
    this._target = null;
    this.vfx_mesh_wobble.cleanup();
    this.vfx_pawn_tank.cleanup();
  }
}

export default PawnTankA;
