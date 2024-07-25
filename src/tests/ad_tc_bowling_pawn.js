import PawnDrawA from "../pawn/d240710_pawn.js";
import * as THREE from "three";
import { Vector3 } from "three";
import { oimo } from "../lib/OimoPhysics.js";
import { Physics, RigidBody, RigidBodyType } from "../physics.js";
import Loader from "../loader.js";
import App from "../app.js";
import { dlerp, Vec3Right, Vec3Up, cache } from "../math.js";
import { InputAction } from "../pawn/inputs_dualstick.js";
import { createImagePlane } from "./utils.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import logger from "../logger.js";

/**
 * @class AdTestcaseBowlingPawn
 * @memberof Pages/Tests
 */
class AdTestcaseBowlingPawn {
  /**
   * @param {string} id .
   */
  constructor(id) {
    /** @type {string} */
    this.id = id;

    /** @type {PawnDrawA} */
    this.pawn_draw = null;

    /** @type {oimo.dynamics.rigidbody.RigidBody} */
    this.pawn_body = null;

    /** @type {THREE.Mesh} */
    this.pawn_dbg_mesh = null;

    /** @type {Physics} */
    this._physics = null;

    this.stun = 0;
		// this value resets only when pawn gets back on legs
		this.stun_active = false;
		// this value disables stun for required time
    this.stun_protection = 0;
		// this value just counts total stuns
		this.stuns_count = 0;
    this.charge_elapsed = 0;
    this.charge = 0;
    this.charge_applied = 0;

    this.config = {
      charge_duration: 600,
      throw_factor: 30,
      stun_duration: 0.5,
      movement_acceletation: 2,
      max_movement_speed: 3,
      spawn_projectile_size: 0.4,
      /** speed that required for hit event */
      hitby_speed_threshold: 2,
      /** maximum time that hit event counts as hit */
      hitby_time_threshold: 2,
    };

    this.attack = false;
    this.move = false;

    this.hitby = {
      /** @type {string} */
      id: null,
      /** @type {number} */
      timestamp: null,
      /** @type {number} */
      stun_timestamp: null,
    };

		this.falls = 0;
  }

  /**
   *
   * @param {InputAction} type .
   * @param {boolean} start .
   * @returns
   */
  action(type, start) {
    if (this.stun > 0 && start) {
      return;
    }

    switch (type) {
      case InputAction.action_a:
        this.move = start;
        break;
      case InputAction.action_b:
        this.attack = start;
        break;
    }
  }

  /**
   * @param {number} x .
   * @param {number} x .
   * @param {string} tag .
   * @param {InputAction} type .
   */
  action_analog(x, y, type) {
    if (this.stun > 0) {
      return;
    }

    const p = cache.vec3.v1;
    const ap = cache.vec3.v2;
    const bp = cache.vec3.v3;
    p.set(-x, 0, -y);
    ap.copy(this.pawn_dbg_mesh.position);
    ap.y = 0.1;
    bp.copy(p).add(ap);

    const attack = this.attack || this.spawn_projectile_requested;
    if (p.length() && (!attack || type != InputAction.action_a)) {
      this.set_goal(bp, type);
    }

    this._physics.raycast(ap, bp, (s, h) => {
      bp.set(h.position.x, 0, h.position.z);
    });

    switch (type) {
      case InputAction.action_a:
        this.pointer_mesh_a.position.copy(bp);
        this.apply_move(p);
        break;
      case InputAction.action_b:
        if (this.attack) {
          this.pointer_mesh_b.position.copy(bp);
        } else {
          p.copy(this.pointer_mesh_b.position).sub(ap).normalize();
          // stick released
          this.spawn_projectile(p);
        }

        this.apply_attack(p);

        break;
    }
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    this.charge_elapsed = this.attack ? this.charge_elapsed + dt : 0;
    this.charge = Math.min(
      1,
      this.charge_elapsed / this.config.charge_duration,
    );

    this.update_collisions();
    this.step_pawn(dt);
    this.animate(dt);
    this.stabilizate_pawn(dt);

    this.stun -= dt * 1e-3;
    this.stun = Math.max(this.stun, 0);
    this.stun_protection -= dt * 1e-3;
    this.stun_protection = Math.max(this.stun_protection, 0);

    if (this.pawn_draw) {
      if (this.stun && this.pawn_draw.stun != !!this.stun) {
        this.spawn_projectile_requested = true;
      }
      this.pawn_draw.stun = !!this.stun;
    }
  }

  update_collisions() {
    let contact_link_list = this.pawn_body.getContactLinkList();
    while (contact_link_list) {
      const contact = contact_link_list.getContact();
      const other = contact_link_list.getOther();

      contact_link_list = contact_link_list.getNext();

      if (other._bowling_type === "projectile") {
        const v = this._physics.cache.vec3_0;
        other.getLinearVelocityTo(v);
        const speed = v.length();
        if (speed > this.config.hitby_speed_threshold) {
          this.hitby.id = other._pawn_id;
          this.hitby.timestamp = Date.now();
          /*
					logger.log(
						`Pawn #${this.id} hit by ${other._pawn_id}'s projectile at speed ${speed}`,
					);
					*/
        }
      }
    }
  }

  animate(dt) {
    if (!this.pawn_draw) {
      return;
    }

    const star_size = this.stun > 0 ? 0.4 : 0;
    const stars_amount = this.vfx_animation_stars.children.length;
    for (let i = 0; i < stars_amount; i++) {
      const c = this.vfx_animation_stars.children[i];
      const f = 0.5 * (i / stars_amount) + 0.2;
			const maxy = 0.5;
			if (this.stun > 0) {
				const y = i < this.stuns_count ? maxy : 0;
				c.position.y = dlerp(c.position.y, y, 0.02, dt * 1e-3);
			}
			const ss2 = 1 - c.position.y / maxy;

      c.scale.setScalar(dlerp(c.scale.x, star_size * ss2, f, dt * 1e-3));
    }

    this.vfx_animation_stars.rotation.y += dt * 3e-3;

    const update_pointer = (mesh, visible) => {
      const pointer_size = visible ? 1 : 0;
      mesh.scale.setScalar(dlerp(mesh.scale.x, pointer_size, 1, dt * 1e-3));
      mesh.rotateY(3e-4 * dt);
    };
    update_pointer(this.pointer_mesh_a, this.move && !this.stun);
    update_pointer(this.pointer_mesh_b, this.attack && !this.stun);

    this.pointer_mesh_charge.scale.x = this.charge * 4;
  }

  step_pawn(dt) {
    if (!this.pawn_draw) {
      return;
    }

    const up = this._physics.get_body_up_dot(this.pawn_body);
    if (up < 0.9 && !this.stun_protection) {
      this._on_stun();
      this.stun = this.config.stun_duration;
    } else if (up > 0.9) {
			this._on_stun_end();
		}

    // apply decoration mesh rotation
    const shift = cache.vec3.v4.set(0, -0.5, 0);
    shift.applyQuaternion(this.pawn_dbg_mesh.quaternion);
    this.pawn_draw._target.position.copy(this.pawn_dbg_mesh.position);
    this.pawn_draw._target.position.add(shift);
    this.pawn_draw.step(dt);
    // cd: discard pawn rotation and set correct world rotation
    this.pawn_draw._target.quaternion.copy(this.pawn_dbg_mesh.quaternion);
    this.pawn_draw._target.rotateY(this.pawn_draw.rotation);

    // place stars
    this.vfx_animation_stars.position.copy(this.pawn_draw._target.position);
    this.vfx_animation_stars.position.y += 0.7;
    this.vfx_animation_stars.position.add(shift.multiplyScalar(-2));

    this._step_requested_spawn_projectile();
  }

	_on_stun_end() {
    if (!this.stun_active) {
			return;
		}

		this.stun_active = false;
		this.hitby.stun_timestamp = null;
		this.hitby.id = null;
		this.hitby.timestamp = null;
		this.stun_protection += 2;
		this.spawn_projectile_requested = false;
	}

  _on_stun() {
    if (this.stun_active) {
      // already in stun state
      return;
    }

		this.stun_active = true;
		// should be counted externally
		//this.stuns_count += 1;

		// drop projectile
		this.spawn_projectile_requested = true;
		this.charge_elapsed = 0;
		this.charge_applied = 0;

    const now = Date.now();
    if (
      this.hitby.id &&
      now - this.hitby.timestamp < this.config.hitby_time_threshold * 1000
    ) {
      this.hitby.stun_timestamp = now;
      logger.log(`Pawn #${this.id} stunned by ${this.hitby.id}'s projectile`);
    }
  }

  _step_requested_spawn_projectile() {
    // spawn projectile in animation middleplay
    const action_hit =
      this.pawn_draw.animator.animation_machine.nodes["hit"].action;
    const action_stun =
      this.pawn_draw.animator.animation_machine.nodes["stun"].action;

    const spawn_queried = action_hit.enabled || action_stun.enabled;
    const hit_spawn_requested = action_hit.enabled && action_hit.time > 0.5;
    const stun_spawn_requested = action_stun.enabled && action_stun.time > 0.6;
    const spawn_requested = hit_spawn_requested || stun_spawn_requested;
    if (this.spawn_projectile_requested && spawn_requested) {
      const direction = cache.vec3.v0;
      if (hit_spawn_requested) {
        direction.copy(this._get_spawn_projectile_direction());
      } else if (stun_spawn_requested) {
        this.pawn_draw._target.getWorldDirection(direction);
        direction.cross(Vec3Up).negate();
      }
      this._spawn_projectile(direction);
      this.spawn_projectile_requested = false;
    } else if (this.spawn_projectile_requested && !spawn_queried) {
      // something interrupted animation - spawn requests discards
      this.spawn_projectile_requested = false;
    }
  }

  stabilizate_pawn(dt, body = this.pawn_body, factor = 0.07) {
    // locks rotation
    //this.pawn_body.setRotationFactor(this._physics.cache.vec3_0.init(0, 0, 0));

    // apply rotation stabilization
    const up = this._physics.get_body_up_dot(body);
    const stabilization = this._physics.cache.vec3_0;
    const r = body.getRotation().toEulerXyz();

    // torque applied ach step - it fas to be frame dependent
    const df = dt / 30;
    const f2 = this.stun_protection ? 2 : 1;
    // should it be  inverse-square time?
    const s = factor * df * f2;

    stabilization.init(-r.x * s, -r.y * s, -r.z * s);
    stabilization.scaleEq(1 - up);
    stabilization.y = -r.y * s * up;
    body.applyAngularImpulse(stabilization);
  }

  /**
   * @param {THREE.Vector3} pos
   * @param {InputAction} action
   */
  set_goal(pos, action) {
    if (this.pawn_draw) {
      this.pawn_draw.goal.copy(pos);
    }
  }

  /**
   * @param {THREE.Vector3} pos
   */
  apply_move(vec) {
    const attack = this.attack || this.spawn_projectile_requested;

    const velocity = this._physics.cache.vec3_2;
    this.pawn_body.getLinearVelocityTo(velocity);
    const force = this._physics.cache.vec3_0;
    force.init(vec.x, 0, vec.z);
    if (attack) {
      force.init(0, 0, 0);
    }
    if (!this.move) {
      velocity.x *= 0.2;
      velocity.z *= 0.2;
      this.pawn_body.setLinearVelocity(velocity);
    }
    const position = this._physics.cache.vec3_1;
    const dot = force.normalized().dot(velocity.normalized());
    const speed = velocity.length();
    this.pawn_body.getPositionTo(position);
    position.y -= 0.1;
    force.scaleEq(
      (2 - dot) *
        Math.max(0, this.config.max_movement_speed - speed) *
        this.config.movement_acceletation,
    );
    this.pawn_body.applyForce(force, position);
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

  /**
   *
   * @param {Physics} physics .
   * @returns AdTestcaseBowlingPawn this
   */
  run(physics) {
    this._physics = physics;

    const id = this.create_phys_body();
    const mesh = this._physics.meshlist[id];
    const body = this._physics.bodylist[id];
    this.pawn_body = body;
    this.pawn_dbg_mesh = mesh;

		// could be helpful for debug without external meshes
    this.pawn_dbg_mesh.visible = false;

    const render = App.instance.render;
    const scene = render.scene;
    this.pointer_mesh_a = render.utils.spawn_icosphere0(0xb768e9);
    this.pointer_mesh_b = render.utils.spawn_icosphere0(0xb7e968);
    scene.add(this.pointer_mesh_a);
    scene.add(this.pointer_mesh_b);
		this.pointer_mesh_a.visible = App.instance.DEBUG;
		this.pointer_mesh_b.visible = App.instance.DEBUG;

    return this;
  }

  create_phys_body() {
    const pos = new Vector3(0, 1, 0);
    const size = new Vector3(0.3, 1, 0);
    const id = this._physics.utils.create_physics_cylinder(
      pos,
      size,
      RigidBodyType.DYNAMIC,
      { friction: 0.1, density: 1, adamping: 5, ldamping: 1 },
      0x48a9b1,
    );

    return id;
  }

  async load() {
    await this._load_pawn();

    const texture_sprite = Loader.instance.get_texture("pic/star0.png");
    const star_material = new THREE.SpriteMaterial({
      map: texture_sprite,
    });
    const sprite_star = new THREE.Sprite(star_material);
    sprite_star.scale.setScalar(0); // hide at creation
    this.vfx_animation_stars = new THREE.Object3D();
    App.instance.render.scene.add(this.vfx_animation_stars);

    const stars = 6;
    const radius = 0.5;
    for (let i = 0; i < stars; i++) {
      const s = sprite_star.clone();
      this.vfx_animation_stars.add(s);
      s.position.x = Math.sin((i / stars) * Math.PI * 2) * radius;
      s.position.z = Math.cos((i / stars) * Math.PI * 2) * radius;
    }

    this._create_pawn_draw();
    this._create_pointer_mesh();

    this.pawn_dbg_mesh.visible = false;
    this.pawn_draw.allow_move = false;
  }

  _create_pointer_mesh() {
    const arrow = createImagePlane("bowling/arrow0.png");
    this.pointer_mesh_charge = new THREE.Object3D();
    this.pointer_mesh_charge.add(arrow);
    this.pointer_mesh_charge.position.y = 0.3;
    arrow.position.x = 0.5;
    arrow.rotateX(-Math.PI * 0.5);
    arrow.rotateZ(-Math.PI * 0.5);
    this.character_scene.add(this.pointer_mesh_charge);
  }

  async _load_pawn() {
    this.character_gltf = await Loader.instance.get_gltf("bowling/pawn2.glb");
    this.character_scene = SkeletonUtils.clone(this.character_gltf.scene);
    this.projectile_gltf = await Loader.instance.get_gltf(
      "bowling/projectile1.glb",
    );
  }

  _create_pawn_draw() {
    this.pawn_draw = new PawnDrawA();
    this.pawn_draw.init(this.character_gltf, this.character_scene);
    App.instance.render.scene.add(this.character_scene);
  }

  _get_spawn_projectile_direction() {
    const facing_direction = cache.vec3.v0
      .copy(Vec3Right)
      .applyAxisAngle(Vec3Up, this.pawn_draw.rotation);

    return facing_direction;
  }

  _spawn_projectile(direction) {
    const radius = this.config.spawn_projectile_size;
    const pos = cache.vec3.v1;
    const dir = direction ?? this._get_spawn_projectile_direction();
    pos
      .copy(dir)
      .setLength(radius * 2)
      .add(this.pawn_draw._target.position);
    pos.y = 0.5;
    const impulse = this._physics.cache.vec3_0;
    impulse.init(dir.x, 0, dir.z);
    impulse.scaleEq(this.config.throw_factor * this.charge_applied);
    let color = new THREE.Color(Math.random(), Math.random(), Math.random());
    const body = this._physics.create_sphere(
      pos,
      radius,
      RigidBodyType.DYNAMIC,
      {
        density: 10,
        friction: 0.3,
        restitution: 0.7,
      },
    );
    body.temporal = true;
    body._bowling_type = "projectile";
    body._pawn_id = this.id;
    body._timestamp = Date.now();
    const mesh = this.projectile_gltf.scene.clone();
    mesh.scale.multiplyScalar(radius * 2);
    mesh.position.copy(pos);
    App.instance.render.scene.add(mesh);
    this._physics.attach(body, mesh);
    body.applyLinearImpulse(impulse);
    this.charge_applied = 0;
  }

  spawn_projectile() {
    this.spawn_projectile_requested = true;
    this.charge_applied = this.charge;
    this.pawn_draw.animator.transite("hit", true);
  }

  stop() {
    if (this.pawn_draw?.dispose) {
      this.pawn_draw.dispose();
    }
    this.character_scene = null;
    this.character_gltf = null;
    this.pawn_draw = null;
    this.pawn_body = null;
    this.pawn_dbg_mesh?.removeFromParent();
    this.pointer_mesh_a?.removeFromParent();
    this.pointer_mesh_b?.removeFromParent();
    this.pointer_mesh_charge?.removeFromParent();
    this.pawn_dbg_mesh = null;
    this._physics = null;
  }
}

export default AdTestcaseBowlingPawn;
