import * as THREE from "three";
import { Vec3Up, Vec3Right, angle_sub, cache } from "../../math.js";
import VfxMeshWobble from "../../pawn/vfx_mesh_wobble.js";
import VfxPawnTankA from "../../pawn/vfx_pawn_tank_a.js";

class PawnDrawTankA {
  constructor() {
    /** @type {VfxMeshWobble} */
    this.vfx_mesh_wobble = new VfxMeshWobble();
    /** @type {VfxPawnTankA} */
    this.vfx_pawn_tank = new VfxPawnTankA();
    /** @type {THREE.Object3D} */
    this._target = null;

    this.pos = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.goal = new THREE.Vector3();

    this.rotation = 0;

    this.allow_move = true;
  }

  /**
   * @param {THREE.Object3D} target
   */
  init(gltf, target) {
    this._target = target;
    this.vfx_mesh_wobble.set_target(target);
    this.vfx_pawn_tank.set_target(target);
    this.gltf = gltf;
    this.pos.copy(this._target.position);
    this.goal.copy(this._target.position);
  }

  step(dt) {
    this.velocity.copy(this.pos.sub(this._target.position));
    this.pos.copy(this._target.position);

    const facing_direction = cache.vec3.v0
      .copy(Vec3Right)
      .applyAxisAngle(Vec3Up, this._target.rotation.y);
    const goal_delta = cache.vec3.v1.copy(this.goal).sub(this.pos);
    goal_delta.y = 0;
    const direction = cache.vec3.v2.copy(goal_delta).normalize();
    const direction_angle = Math.atan2(direction.x, direction.z);

    const df = dt / 30;
    const rotate = angle_sub(this.rotation, direction_angle - Math.PI / 2);

    if (goal_delta.length() > 1e-1) {
      if (this.allow_move) {
        this._target.position.add(facing_direction.multiplyScalar(df * 0.04));
      }
      this.rotation += rotate * df * 0.3;
      this._target.rotation.y = this.rotation;
    }

    this.vfx_mesh_wobble.step(dt);
    this.vfx_pawn_tank.step(dt);
  }

  dispose() {
    this.gltf = null;
    this._target = null;
    this.vfx_mesh_wobble.cleanup();
    this.vfx_pawn_tank.cleanup();
  }
}

export default PawnDrawTankA;
