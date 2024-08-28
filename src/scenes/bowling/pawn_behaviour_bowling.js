import PawnBowlingA from "./pawn_bowling.js";
import { Vector3 } from "three";
import { cache } from "../../math.js";
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
			shoot_limit: 2,
			shoot_limit_recharge: 3000,
			hearts_limit: 3,
			hearts_limit_recharge: 5000,
			aim_direction_priority: true,
		};

		this.aims = false;
		this.moves = false;

		this.shoot_requested = false;
		this.shoot_direction = new Vector3();

		this.stun_time = 0;
		this.stun = false;

		this.invulnerable = false;

		this.shoots_spent = 0;
		this.shoot_recharge_t = 0;

		this.hearts_spent = 0;
		this.hearts_recharge_t = 0;
		this.dead = false;

		this.contacts = 0;
	}

	step(dt) {
		this._step_spawn_projectile();
		this._step_pawn_stun(dt);
		this._step_recharges(dt);
		this._step_collisions(dt);

		if (!this.stun_time) {
			this.stabilizate_body(dt);
		}
	}

	_step_collisions() {
		let contact_link_list = this._pawn.pawn_body.getContactLinkList();
		this.contacts = 0;
		while (contact_link_list) {
			const contact = contact_link_list.getContact();
			const other = contact_link_list.getOther();

			contact_link_list = contact_link_list.getNext();

			if (!contact.isTouching()) {
				continue;
			}

			this.contacts += 1;

			if (!other.userData?.type_projectile) {
				continue;
			}

			this.hurt();
			const projectile = this._pawn._level.projectiles[other.id];
			projectile?.crush();
		}
	}

	_step_recharges(dt) {
		if (this.config.shoot_limit && this.shoots_spent) {
			this.shoot_recharge_t += dt;

			if (this.shoot_recharge_t >= this.config.shoot_limit_recharge) {
				this.shoot_recharge_t = 0;
				this.shoots_spent -= 1;
			}
		}
		if (this.config.hearts_limit && this.hearts_spent) {
			this.hearts_recharge_t += dt;

			if (this.hearts_recharge_t >= this.config.hearts_limit_recharge) {
				this.hearts_recharge_t = 0;
				this.hearts_spent -= 1;
			}
		}
	}

	_step_pawn_stun(dt) {
		this.stun_time -= dt;
		this.stun_time = Math.max(this.stun_time, 0);

		const up = this._pawn._physics.get_body_up_dot(this._pawn.pawn_body);
		if (up < 0.9 && !this.stun_time && !this.stun) {
			this.stun_time = 1000;
			this.stun = true;
		} else if (up > 0.95 && this.stun_time <= 0) {
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
		PawnBehaviourBowlingA.stabilizate_body(
			this._pawn._physics,
			dt,
			this._pawn.pawn_body,
			factor,
		);
	}

	move(x, z) {
		if (this.stun) {
			return;
		}

		if (!this.contacts) {
			return;
		}

		this.moves = Boolean(x && z);

		const physics = this._pawn._physics;

		const vec = physics.cache.vec3_0;
		vec.init(x, 0, z);
		vec.normalize();
		vec.scaleEq(2);

		/*
		const vecv = physics.cache.vec3_1;
		this._pawn.pawn_body.getLinearVelocityTo(vecv);
		vec.y = vecv.y;
		*/

		this._pawn.pawn_body.setLinearVelocity(vec);

		if (this.config.aim_direction_priority && this.aims) {
			return;
		}

		this._pawn.pawn_draw.direction.set(x, 0, z);
	}

	spawn_projectile(direction) {
		if (this.stun) {
			return;
		}

		this.shoot_requested = false;

		this._pawn._level.create_projectile(this._pawn, direction);
	}

	aim(x, z) {
		this.aims = false;

		if (this.stun) {
			return;
		}

		if (
			this.config.shoot_limit &&
			this.config.shoot_limit <= this.shoots_spent
		) {
			return;
		}

		this.aims = Boolean(x && z);

		this._pawn.pawn_draw.direction.set(x, 0, z);
	}

	shoot() {
		if (this.stun) {
			return;
		}

		if (
			this.config.shoot_limit &&
			this.config.shoot_limit <= this.shoots_spent
		) {
			return;
		}

		this.shoots_spent += 1;
		this.shoot_recharge_t = 0;
		this.hearts_recharge_t = 0;

		const dir = this._pawn.pawn_draw.direction;
		this.shoot_direction.copy(dir);
		if (this.config.shoot_instant) {
			this.spawn_projectile(this.shoot_direction);
		} else {
			this._pawn.pawn_draw.animator.transite("hit", true);
			this.shoot_requested = true;
		}
	}

	hurt() {
		if (this.stun || this.invulnerable) {
			return;
		}

		this.shoot_recharge_t = 0;
		this.hearts_recharge_t = 0;
		this.hearts_spent += 1;
		this.stun_time = 1000;
		this.stun = true;

		if (this.hearts_spent >= this.config.hearts_limit) {
			this.stun_time = Infinity;
			this._pawn.pawn_draw.stun = true;
			this.dead = true;
		}
	}

	get shoots_spent_f() {
		return this.shoots_spent / this.config.shoot_limit;
	}

	get hearts_spent_f() {
		return this.hearts_spent / this.config.hearts_limit;
	}

	revive() {
		this.shoot_recharge_t = 0;
		this.hearts_recharge_t = 0;
		this.hearts_spent = 0;
		this.shoots_spent = 0;
		this.stun_time = 0;
		this._pawn.pawn_draw.stun = false;
		this.stun = false;
		this.dead = false;
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
