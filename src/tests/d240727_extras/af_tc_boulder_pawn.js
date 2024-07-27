import AdTestcaseBowlingPawn from "../d240727_bowling/ad_tc_bowling_pawn.js";
import PawnDrawTankA from "./d240718_pawn_tank.js";
import { Vector3 } from "three";
import { Physics, RigidBody, RigidBodyType } from "../../physics.js";
import Loader from "../../loader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { InputAction } from "../../pawn/inputs_dualstick.js";
import App from "../../app.js";
import { dlerp, Vec3Right, Vec3Up, cache } from "../../math.js";
import { createImagePlane } from "../utils.js";
import * as THREE from "three";

/**
 * @class AdTestcaseTankPawn
 * @memberof Pages/Tests
 */
class AdTestcaseTankPawn extends AdTestcaseBowlingPawn {
  constructor() {
    super();

    this.pawn_draw = {
      _target: null,
    }; // no need

    this.config.max_movement_speed = 55;
    this.config.spawn_projectile_size = 0.7;
    this.config.throw_factor = 50;

    this.aim_direction = new Vector3();
  }

  /**
   * @param {THREE.Vector3} pos
   * @param {InputAction} action
   */
  set_goal(pos, action) {
    switch (action) {
      case InputAction.action_a:
        break;
      case InputAction.action_b:
        const x = pos.x - this.character_scene.position.x;
        const z = pos.z - this.character_scene.position.z;
        this.aim_direction.set(x, 0, z);
        break;
    }
  }

  step_pawn(dt) {
    this.character_scene.position.copy(this.pawn_dbg_mesh.position);
    this.character_scene.quaternion.copy(this.pawn_dbg_mesh.quaternion);
		this._step_requested_spawn_projectile();
  }

  stabilizate_pawn(dt, body = this.pawn_body, factor = 0.07) {}

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
    const pos = this._physics.cache.vec3_2;
    this.pawn_body.getPositionTo(pos);
    const force = this._physics.cache.vec3_0;
    force.init(vec.x, 0, vec.z);
    force.scaleEq(this.config.max_movement_speed);
    this.pawn_body.applyForce(force, pos);
  }

  create_phys_body() {
    const pos = new Vector3(0, 1, 0);
    const size = 0.5;
    const id = this._physics.utils.create_physics_sphere(
      pos,
      size,
      RigidBodyType.DYNAMIC,
      { friction: 10, density: 20, adamping: 0, ldamping: 0 },
      0x48a9b1,
    );

    return id;
  }

  async _load_pawn() {
    this.character_gltf = await Loader.instance.get_gltf(
      "bowling/projectile1.glb",
    );
    this.character_scene = SkeletonUtils.clone(this.character_gltf.scene);
  }

  _create_pawn_draw() {
    App.instance.render.scene.add(this.character_scene);
    this.pawn_draw._target = this.character_scene;
  }

  _step_requested_spawn_projectile() {
    if (this.spawn_projectile_requested) {
      this.spawn_projectile_requested = false;
    }
  }

  spawn_projectile() {
    this.spawn_projectile_requested = true;
    this.charge_applied = this.charge;

    const force = this._physics.cache.vec3_0;
		force.init(0, 0, 0);
		this.pawn_body.setLinearVelocity(force);
    const pos = this._physics.cache.vec3_2;
    this.pawn_body.getPositionTo(pos);
    force.init(this.aim_direction.x, 0.7, this.aim_direction.z);
    force.scaleEq(this.config.max_movement_speed * this.charge);
    this.pawn_body.applyImpulse(force, pos);
  }

  _get_spawn_projectile_direction() {
    return this.aim_direction;
  }

  _create_pointer_mesh() {
		super._create_pointer_mesh();
		this.pointer_mesh_charge.removeFromParent();
		App.instance.render.scene.add(this.pointer_mesh_charge);
  }

  animate(dt) {
    super.animate(dt);

		this.pointer_mesh_charge.position.copy(this.pawn_dbg_mesh.position);
		const rot = Math.atan2(this.aim_direction.x, this.aim_direction.z);
		this.pointer_mesh_charge.rotation.y = rot - Math.PI * 0.5;
  }
}

export default AdTestcaseTankPawn;
