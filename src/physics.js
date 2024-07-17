/** @namespace Physics */

import * as THREE from "three";
import { Vector3 } from "three";

import { oimo } from "./lib/OimoPhysics.js";
import DebugDraw from "./physics_debug.js";
import PhysicsUtils from "./physics_utils.js";

import App from "./app.js";

const RigidBodyType = oimo.dynamics.rigidbody.RigidBodyType;
const RigidBody = oimo.dynamics.rigidbody.RigidBody;

/**
 * @typedef MeshAttachOpts
 * @property {THREE.Vector3} shift
 * @property {boolean} allow_rotate .
 * @property {boolean} allow_translate .
 */

/**
 * @typedef BodyOpts
 * @property {number} friction
 * @property {number} density
 * @property {number} adamping
 * @property {number} ldamping
 * @property {number} restitution
 */

/**
 * base physics (oimo) management class
 *
 * @class Physics
 * @memberof Physics
 */
class Physics {
  constructor() {
    /** @type {oimo.dynamics.World} */
    this.world = null;

    /** @type {DebugDraw} */
    this.debug_draw = null;

    this.config = {
      fixed_step: true,
			limit_step: true
    };

    /** @type {object<string, RigidBody>} */
    this.bodylist = {};
    /** @type {object<string, THREE.Object3D>} */
    this.meshlist = {};
    /** @type {object<string, MeshAttachOpts>} */
    this.attachopts = {};

    this.cache = {
      vec3_0: new oimo.common.Vec3(),
      vec3_1: new oimo.common.Vec3(),
      vec3_2: new oimo.common.Vec3(),
			vec3up: new oimo.common.Vec3().init(0, 1, 0),
			mat3: new oimo.common.Mat3(),
      raycast: new oimo.dynamics.callback.RayCastCallback(),
    };

    this.utils = new PhysicsUtils(this);

    this.guids = 0;
  }

  /**
   * @param {object?} [opts] .
   * @param {boolean} [opts.fixed_step] .
   * @param {boolean} [opts.limit_step] limits minimum physics framerate at 20 to avoid low-fps related bugs
   */
  run(opts) {
    this.config.fixed_step = opts?.fixed_step ?? this.config.fixed_step;
    this.config.limit_step = opts?.limit_step ?? this.config.limit_step;

    const broadphase = 2; // 1 brute force, 2 sweep and prune, 3 volume tree
    this.world = new oimo.dynamics.World(
      broadphase,
      new oimo.common.Vec3(0, -9.8, 0),
    );

		if (App.instance.settings.debug) {
			this.debug_draw = new DebugDraw(App.instance.render.scene);
			this.debug_draw.wireframe = true;
			this.debug_draw.drawJointLimits = true;
			this.debug_draw.drawBases = true;
			this.world.setDebugDraw(this.debug_draw);
		}

    return this;
  }

  stop() {
    this.world = null;
    this.bodylist = {};
    this.meshlist = {};
    this.attachopts = {};
  }

  step(dt) {
		let fdt = this.config.fixed_step ? 1 / 60 : dt * 1e-3;
		if (this.config.limit_step && !this.config.fixed_step) {
			fdt = Math.min(1/20, fdt);
		}

    this.world.step(fdt);

		if (this.debug_draw) {
			this.debug_draw.begin();
			this.world.debugDraw();
			this.debug_draw.end();
		}

    for (const k in this.meshlist) {
      /** @type {RigidBody} */
      const body = this.bodylist[k];
      const mesh = this.meshlist[k];
      const opts = this.attachopts[k];
      const position = body.getPosition();
      const quaternion = body.getOrientation();
      if (opts?.allow_translate ?? true) {
        mesh.position.x = position.x + (opts?.shift?.x ?? 0);
        mesh.position.y = position.y + (opts?.shift?.y ?? 0);
        mesh.position.z = position.z + (opts?.shift?.z ?? 0);
      }
      if (opts?.allow_rotate ?? true) {
        mesh.quaternion.x = quaternion.x;
        mesh.quaternion.y = quaternion.y;
        mesh.quaternion.z = quaternion.z;
        mesh.quaternion.w = quaternion.w;
      }
    }
  }

  /**
   * @param {Vector3} pos .
   * @param {oimo.collision.geometry.Geometry} geometry .
   * @param {RigidBodyType} type .
   * @param {BodyOpts} [opts] .
   * @returns {RigidBody} .
   */
  create_body(pos, geometry, type, opts) {
    const body_config = new oimo.dynamics.rigidbody.RigidBodyConfig();
    body_config.position.init(pos.x, pos.y, pos.z);
    body_config.type = type;
    body_config.angularDamping = opts?.adamping ?? 0;
    body_config.linearDamping = opts?.ldamping ?? 0;
    const body = new RigidBody(body_config);
    const shape_config = new oimo.dynamics.rigidbody.ShapeConfig();
    shape_config.geometry = geometry;
    shape_config.density = opts?.density ?? 1;
    shape_config.friction = opts?.friction ?? 1;
    shape_config.restitution = opts?.restitution ?? 0.1;
    const shape = new oimo.dynamics.rigidbody.Shape(shape_config);
    body.addShape(shape);
    this.world.addRigidBody(body);

    const id = "b" + this.guids++;
    this.bodylist[id] = body;
    body.id = id;

    return body;
  }

  /**
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {BodyOpts} [opts] .
   * @returns {RigidBody} .
   */
  create_box(pos, size, type, opts) {
    const geometry = new oimo.collision.geometry.BoxGeometry(
      new oimo.common.Vec3(size.x * 0.5, size.y * 0.5, size.z * 0.5),
    );

    return this.create_body(pos, geometry, type, opts);
  }

  /**
   * @param {Vector3} pos .
   * @param {number} radius .
   * @param {RigidBodyType} type .
   * @param {BodyOpts} [opts] .
   * @returns {RigidBody} .
   */
  create_sphere(pos, radius, type, opts) {
    const geometry = new oimo.collision.geometry.SphereGeometry(radius);

    return this.create_body(pos, geometry, type, opts);
  }

  /**
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {BodyOpts} [opts] .
   * @returns {RigidBody} .
   */
  create_cylinder(pos, size, type, opts) {
    const geometry = new oimo.collision.geometry.CylinderGeometry(
      size.x,
      size.y * 0.5,
    );

    return this.create_body(pos, geometry, type, opts);
  }

  /**
   * @param {RigidBody} body .
   * @param {THREE.Object3D} mesh .
   * @param {MeshAttachOpts?} [opts] .
   */
  attach(body, mesh, opts) {
    this.meshlist[body.id] = mesh;
    if (opts) {
      this.attachopts[body.id] = opts;
    }
  }

  /**
   * @param {RigidBody} a
   * @param {RigidBody} b
   * @param {Vector3?} [axis] .
   * @param {Vector2?} [torque] .
   */
  create_joint_motor(a, b, axis, torque = 0) {
    const motor = new oimo.dynamics.constraint.joint.RotationalLimitMotor();
    const config = new oimo.dynamics.constraint.joint.RevoluteJointConfig();
    const _axis = this.cache.vec3_0;
		_axis.init(axis?.x ?? 0, axis?.y ?? 1, axis?.z ?? 0);
    config.init(a, b, a.getPosition(), _axis);
    motor.setMotor(torque?.x ?? 0, torque?.y ?? 0);
    config.limitMotor = motor;

    const joint = new oimo.dynamics.constraint.joint.RevoluteJoint(config);
    this.world.addJoint(joint);

    return motor;
  }

  /**
   * @param {Vector3} a .
   * @param {Vector3} b .
   * @param {function(oimo.dynamics.rigidbody.Shape, oimo.collision.geometry.RayCastHit): void} b .
   */
  raycast(a, b, callback) {
    const ray_a = this.cache.vec3_0.init(a.x, a.y, a.z);
    const ray_b = this.cache.vec3_1.init(b.x, b.y, b.z);
    this.cache.raycast.process = callback;
    this.world.rayCast(ray_a, ray_b, this.cache.raycast);
  }

	/**
	 * uses physics.cache.vec3_0
	 *
	 * @param {RigidBody} body .
	 */
	get_body_up_dot(body) {
    const local_up = this.cache.vec3_0;
    local_up.init(0, 1, 0);
    local_up.mulMat3Eq(
      body.getRotation().transposeEq(),
    );
    const dot = local_up.dot(this.cache.vec3up);

		return dot;
	}
}

export default Physics;
export { Physics, RigidBodyType, RigidBody };
