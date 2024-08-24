import PawnBowlingA from "./pawn_bowling.js";
import { Vector3 } from "three";
import { cache } from "../../math.js";
import { Physics, RigidBodyType } from "../../physics.js";
import App from "../../app.js";

class PawnBehaviourBowlingA {
  /**
   * @param {PawnBowlingA} pawn
   */
  constructor(pawn) {
    /** @param {PawnBowlingA} */
    this._pawn = pawn;

		this.config = {
			shoot_instant: true,
			aim_direction_priority: true
		}

		this.shoot_requested = false;
		this.shoot_direction = new Vector3();

		this.stun_time = 0;
		this.stun = false;
	}

	step(dt) {
		this._step_spawn_projectile();
		this._step_pawn_stun(dt);

		if (!this.stun_time) {
			this.stabilizate_body(dt);
		}
	}

	_step_pawn_stun(dt) {
		this.stun_time -= dt;
		this.stun_time = Math.max(this.stun_time, 0);

    const up = this._pawn._physics.get_body_up_dot(this._pawn.pawn_body);
		if (up < 0.9 && !this.stun_time && !this.stun) {
			this.stun_time = 1000;
			this.stun = true;
		} else if (up > 0.9) {
			this.stun = false;
		}
	}

	_step_spawn_projectile() {
		if (!this.shoot_requested) {
			return false;
		}

    const action_hit =
      this._pawn.pawn_draw.animator.animation_machine.nodes["hit"].action;
    const spawn_queried = action_hit.enabled;
    const hit_spawn_requested = action_hit.enabled && action_hit.time > 0.5;
    const spawn_requested = hit_spawn_requested;

		if (spawn_requested) {
			this.spawn_projectile(this.shoot_direction);
		} else if (!spawn_queried) {
			this.shoot_requested = false;
		}
	}

  stabilizate_body(dt, factor = 0.07) {
    PawnBehaviourBowlingA.stabilizate_body(this._pawn._physics, dt, this._pawn.pawn_body, factor);
  }

	move(x, z) {
		if (this.stun) {
			return;
		}

    const physics = this._pawn._physics;
    const vec = physics.cache.vec3_0;
    vec.init(x, 0, z);
		vec.scaleEq(2);
    this._pawn.pawn_body.setLinearVelocity(vec);

		if (this.config.aim_direction_priority && this._pawn.pawn_actions.aims) {
			return;
		}

    this._pawn.pawn_draw.direction.set(x, 0, z);
	}

	spawn_projectile(direction) {
		if (this.stun) {
			return;
		}

		this.shoot_requested = false;

    const radius = 0.5;
    const pos = cache.vec3.v1;
    const dir = direction;
    pos
      .copy(dir).normalize()
      .setLength(radius * 2)
      .add(this._pawn.pawn_draw._target.position);
    pos.y = 0.5;
    const body = this._pawn._physics.create_sphere(
      pos,
      radius,
      RigidBodyType.DYNAMIC,
      {
        density: 10,
        friction: 0.3,
        restitution: 0.7,
      },
    );
    const mesh = this._pawn.projectile_gltf.scene.clone();
    mesh.scale.multiplyScalar(radius * 2);
    mesh.position.copy(pos);
    App.instance.render.scene.add(mesh);
    this._pawn._physics.attach(body, mesh);

    const impulse = this._pawn._physics.cache.vec3_0;
    impulse.init(dir.x, 0, dir.z);
    impulse.scaleEq(50);
    body.applyLinearImpulse(impulse);
	}

	aim(x, z) {
		if (this.stun) {
			return;
		}

    this._pawn.pawn_draw.direction.set(x, 0, z);
	}

	shoot() {
		if (this.stun) {
			return;
		}

    const dir = this._pawn.pawn_draw.direction;
		this.shoot_direction.copy(dir);
		if (this.config.shoot_instant) {
			this.spawn_projectile(this.shoot_direction);
		} else {
			this._pawn.pawn_draw.animator.transite("hit", true);
			this.shoot_requested = true;
		}
	}

  static stabilizate_body(physics, dt, body, factor = 0.07) {
    // locks rotation
    //this.pawn_body.setRotationFactor(this._physics.cache.vec3_0.init(0, 0, 0));

    // apply rotation stabilization
    const up = physics.get_body_up_dot(body);
    const stabilization = physics.cache.vec3_0;
    const r = body.getRotation().toEulerXyz();

    // torque applied ach step - it fas to be frame dependent
    const df = dt / 30;
    const f2 = 1;
    // should it be  inverse-square time?
    const s = factor * df * f2;

    stabilization.init(-r.x * s, -r.y * s, -r.z * s);
    stabilization.scaleEq(1 - up);
    stabilization.y = -r.y * s * up;
    body.applyAngularImpulse(stabilization);
  }
}

export default PawnBehaviourBowlingA;
