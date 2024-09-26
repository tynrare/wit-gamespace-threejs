/** @namespace Physics */

import * as THREE from "three";
import { cache } from "./math.js";
import { Vector3 } from "three";

import { oimo } from "./lib/OimoPhysics.js";
import DebugDraw from "./physics_debug.js";
import PhysicsUtils from "./physics_utils.js";

import App from "./app.js";

const RigidBodyType = oimo.dynamics.rigidbody.RigidBodyType;
/** @type {oimo.dynamics.rigidbody.RigidBody} */
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
      limit_step: true,
    };

    /** @type {Object<string, oimo.dynamics.rigidbody.RigidBody>} */
    this.bodylist = {};
    /** @type {Object<string, THREE.Object3D>} */
    this.meshlist = {};
    /** @type {Object<string, MeshAttachOpts>} */
    this.attachopts = {};

    this.cache = {
      vec3_0: new oimo.common.Vec3(),
      vec3_1: new oimo.common.Vec3(),
      vec3_2: new oimo.common.Vec3(),
      vec3up: new oimo.common.Vec3().init(0, 1, 0),
      quat: new oimo.common.Quat(),
      mat3: new oimo.common.Mat3(),
      raycast: new oimo.dynamics.callback.RayCastCallback(),
      transform: new oimo.common.Transform(),
      transformZero: new oimo.common.Transform(),
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

    this.world = new oimo.dynamics.World(
      oimo.collision.broadphase.BroadPhaseType.BVH,
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

  stop(cleanup = true) {
    this.world = null;
    this.bodylist = {};
    this.meshlist = {};
    this.attachopts = {};
    if (cleanup) {
      for (const k in this.bodylist) {
        this.remove(this.bodylist[k]);
      }
    }
  }

  step(dt) {
    let fdt = this.config.fixed_step ? 1 / 60 : dt * 1e-3;
    if (this.config.limit_step && !this.config.fixed_step) {
      fdt = Math.min(1 / 20, fdt);
    }

    this.world.step(fdt);

    if (this.debug_draw) {
      this.debug_draw.begin();
      this.world.debugDraw();
      this.debug_draw.end();
    }

    for (const k in this.meshlist) {
      this.step_attach(k);
    }
  }

  step_attach(id) {
    /** @type {oimo.dynamics.rigidbody.RigidBody} */
    const body = this.bodylist[id];
    const mesh = this.meshlist[id];
    const opts = this.attachopts[id];
    const parent_wp = mesh.parent.getWorldPosition(cache.vec3.v9);

    const position = this.cache.vec3_0;
    body.getPositionTo(position);
    const quaternion = this.cache.quat;
    body.getOrientationTo(quaternion);
    if (opts?.allow_translate ?? true) {
      mesh.position.x = position.x + (opts?.shift?.x ?? 0) - parent_wp.x;
      mesh.position.y = position.y + (opts?.shift?.y ?? 0) - parent_wp.y;
      mesh.position.z = position.z + (opts?.shift?.z ?? 0) - parent_wp.z;
    }
    if (opts?.allow_rotate ?? true) {
      mesh.quaternion.x = quaternion.x;
      mesh.quaternion.y = quaternion.y;
      mesh.quaternion.z = quaternion.z;
      mesh.quaternion.w = quaternion.w;
    }
  }

  /**
   * @param {Vector3} pos .
   * @param {oimo.collision.geometry.Geometry} geometry .
   * @param {RigidBodyType} type .
   * @param {BodyOpts} [opts] .
   * @returns {oimo.dynamics.rigidbody.RigidBody} .
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

    this.add_body(body)

    return body;
  }

  add_body(body) {
    this.world.addRigidBody(body);
    const id = "b" + this.guids++;
    this.bodylist[id] = body;
    body.id = id;
  }

  /**
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {BodyOpts} [opts] .
   * @returns {oimo.dynamics.rigidbody.RigidBody} .
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
   * @returns {oimo.dynamics.rigidbody.RigidBody} .
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
   * @returns {oimo.dynamics.rigidbody.RigidBody} .
   */
  create_cylinder(pos, size, type, opts) {
    const geometry = new oimo.collision.geometry.CylinderGeometry(
      size.x,
      size.y * 0.5,
    );

    return this.create_body(pos, geometry, type, opts);
  }

  /**
   * @param {oimo.dynamics.rigidbody.RigidBody} body .
   * @param {THREE.Object3D} mesh .
   * @param {MeshAttachOpts?} [opts] .
   */
  attach(body, mesh, opts) {
    this.meshlist[body.id] = mesh;
    if (opts) {
      this.attachopts[body.id] = opts;
    }

    this.step_attach(body.id);
  }

  /**
   * @param {oimo.dynamics.rigidbody.RigidBody} a
   * @param {oimo.dynamics.rigidbody.RigidBody} b
   * @param {Vector3?} [anchor] .
   * @param {Vector3?} [axis] .
   * @param {object?} [opts] .
   * @param {number} [opts.torque=0] .
   * @param {number} [opts.speed=0] .
   * @param {number} [opts.spring=0] .
   */
  create_joint_motor(a, b, anchor, axis, opts) {
    const motor = new oimo.dynamics.constraint.joint.RotationalLimitMotor();
    const config = new oimo.dynamics.constraint.joint.RevoluteJointConfig();
    const _axis = this.cache.vec3_0;
    _axis.init(axis?.x ?? 0, axis?.y ?? 1, axis?.z ?? 0);
    config.init(a, b, anchor ?? a.getPosition(), _axis);
    motor.setMotor(opts?.speed ?? 0, opts?.torque ?? 0);
    config.limitMotor = motor;
    if (opts?.spring) {
      config.springDamper = new oimo.dynamics.constraint.joint.SpringDamper();
      config.springDamper.setSpring(opts.spring, 0.2);
    }

    const joint = new oimo.dynamics.constraint.joint.RevoluteJoint(config);
    this.world.addJoint(joint);

    return joint;
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
   * @param {oimo.dynamics.rigidbody.RigidBody} body .
   */
  get_body_up_dot(body) {
    const local_up = this.cache.vec3_0;
    const mat = this.cache.mat3;
    local_up.init(0, 1, 0);
    body.getRotationTo(mat)
    local_up.mulMat3Eq(mat.transposeEq());
    const dot = local_up.dot(this.cache.vec3up);

    return dot;
  }

  /**
   * @param {oimo.dynamics.rigidbody.RigidBody} body .
   */
  remove(body) {
    this.world.removeRigidBody(body);
    const mesh = this.meshlist[body.id];
    if (mesh) {
      mesh.removeFromParent();
    }

    delete this.bodylist[body.id];
    delete this.meshlist[body.id];
    delete this.attachopts[body.id];
  }
}

export default Physics;
export { Physics, RigidBodyType, RigidBody };
