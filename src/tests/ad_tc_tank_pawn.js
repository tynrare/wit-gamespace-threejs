import AdTestcaseBowlingPawn from "./ad_tc_bowling_pawn.js";
import PawnDrawTankA from "../pawn/d240718_pawn_tank.js";
import { Vector3 } from "three";
import { Physics, RigidBody, RigidBodyType } from "../physics.js";
import Loader from "../loader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { InputAction } from "../pawn/inputs_dualstick.js";
import App from "../app.js";
import { dlerp, Vec3Right, Vec3Up, cache } from "../math.js";
import { createImagePlane } from "./utils.js";
import * as THREE from "three";

/**
 * @class AdTestcaseTankPawn
 * @memberof Pages/Tests
 */
class AdTestcaseTankPawn extends AdTestcaseBowlingPawn {
  constructor() {
    super();
    /** @type {PawnDrawTankA} */
    this.pawn_draw = null;

    this.config.max_movement_speed = 5;
    this.config.spawn_projectile_size = 0.7;
    this.config.throw_factor = 50;

		this.aim_direction = new Vector3();
  }

  /**
   * @param {THREE.Vector3} pos
   * @param {InputAction} action
   */
  set_goal(pos, action) {
    if (!this.pawn_draw) {
      return;
    }

    switch (action) {
      case InputAction.action_a:
        this.pawn_draw.goal.copy(pos);
        break;
      case InputAction.action_b:
        const x = pos.x - this.pawn_draw._target.position.x;
        const z = pos.z - this.pawn_draw._target.position.z;
				this.aim_direction.set(x, 0, z);
        this.pawn_draw.vfx_pawn_tank.look_at(x, z);
        break;
    }
  }

  /**
   * @param {THREE.Vector3} pos
   */
  apply_attack(vec) {
    if (!this.attack) {
      // stick released
      this.spawn_projectile(vec);
    } else {
    }
  }

  apply_move(vec) {
    const attack = this.attack || this.spawn_projectile_requested;

    const velocity = this._physics.cache.vec3_2;
    this.pawn_body.getLinearVelocityTo(velocity);
    const force = this._physics.cache.vec3_0;
    force.init(vec.x, 0, vec.z);
    if (attack) {
      force.init(0, 0, 0);
    }
		force.scaleEq(this.config.max_movement_speed);
		force.y = velocity.y;
    this.pawn_body.setLinearVelocity(force);
  }

  create_phys_body() {
    const pos = new Vector3(0, 1, 0);
    const size = new Vector3(0.9, 1, 0);
    const id = this._physics.utils.create_physics_cylinder(
      pos,
      size,
      RigidBodyType.DYNAMIC,
      { friction: 0, density: 2, adamping: 5, ldamping: 1 },
      0x48a9b1,
    );

    return id;
  }

  async _load_pawn() {
    this.character_gltf = await Loader.instance.get_gltf("tanks/pawn0.glb");
    this.character_scene = SkeletonUtils.clone(this.character_gltf.scene);
    this.projectile_gltf = await Loader.instance.get_gltf(
      "bowling/projectile1.glb",
    );
  }

  _create_pawn_draw() {
    this.pawn_draw = new PawnDrawTankA();
    this.pawn_draw.init(this.character_gltf, this.character_scene);
    App.instance.render.scene.add(this.character_scene);
  }

  _step_requested_spawn_projectile() {
    if (this.spawn_projectile_requested) {
      this.spawn_projectile_requested = false;
      this._spawn_projectile();
    }
  }

  spawn_projectile() {
    this.spawn_projectile_requested = true;
    this.charge_applied = this.charge;
  }

  _get_spawn_projectile_direction() {
    return this.aim_direction;
  }

  animate(dt) {
    if (!this.pawn_draw) {
      return;
    }

    super.animate(dt);

    this.pointer_mesh_charge.rotation.y =
      this.pawn_draw.vfx_pawn_tank.tower.rotation.y;
  }
}

export default AdTestcaseTankPawn;
