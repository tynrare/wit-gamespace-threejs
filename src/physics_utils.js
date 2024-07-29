import Physics from "./physics";
import App from "./app.js";
import * as THREE from "three";
import { oimo } from "./lib/OimoPhysics.js";

class PhysicsUtils {
  /**
   *
   * @param {Physics} physics .
   */
  constructor(physics) {
    this._physics = physics;
  }

  /**
   * Creates box with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {object} [opts] .
   * @param {number} color .
   * @returns {string} body id
   */
  create_physics_box(pos, size, type, otps, color = 0xffffff) {
    const body = this._physics.create_box(pos, size, type, otps);
    let geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    let material = App.instance.render.utils.create_material0(color);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this._physics.attach(body, mesh);

    return body.id;
  }

  /**
   * Creates sphere with mesh
   * @param {Vector3} pos .
   * @param {number} sphere .
   * @param {RigidBodyType} type .
   * @param {object} [opts] .
   * @param {boolean} [opts.icosphere] .
   * @param {number} [color=0xffffff] .
   * @returns {string} body id
   */
  create_physics_sphere(pos, radius, type, opts, color = 0xffffff) {
    const body = this._physics.create_sphere(pos, radius, type, opts);
    let geometry = opts?.icosphere
      ? new THREE.IcosahedronGeometry(radius)
      : new THREE.SphereGeometry(radius);
    let material = App.instance.render.utils.create_material0(color);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this._physics.attach(body, mesh);

    return body.id;
  }

  /**
   * Creates cylinder with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {object?} [opts] .
   * @param {number} [opts.friction=1] .
   * @param {number} [opts.sides=6] .
   * @param {number} [color] .
   * @returns {string} body id
   */
  create_physics_cylinder(pos, size, type, opts, color = 0xffffff) {
    const body = this._physics.create_cylinder(pos, size, type, opts);
    let geometry = new THREE.CylinderGeometry(
      size.x,
      size.x,
      size.y,
      opts?.sides ?? 6,
    );
    let material = App.instance.render.utils.create_material0(color);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this._physics.attach(body, mesh);

    return body.id;
  }

  /**
   * @param {oimo.dynamics.rigidbody.RigidBody} a .
   * @param {oimo.dynamics.rigidbody.RigidBody} b .
   * @param {oimo.common.Vec3} anchor .
   */
  create_generic_joint(a, b, anchor) {
    const j = oimo.dynamics.constraint.joint;
    const config = new j.GenericJointConfig();
    const m = new oimo.common.Mat3();
    config.init(b, a, anchor, m, m);
    const rotXLimit = new j.RotationalLimitMotor().setLimits(0, 0);
    const rotYLimit = new j.RotationalLimitMotor().setLimits(0, 0);
    const rotZLimit = new j.RotationalLimitMotor().setLimits(0, 0);
    const translXLimit = new j.TranslationalLimitMotor().setLimits(0, 0);
    const translYLimit = new j.TranslationalLimitMotor().setLimits(0, 0);
    const translZLimit = new j.TranslationalLimitMotor().setLimits(0, 0);

		// zero springs works badly.. Should has some nonzero values
    const transXSd = new j.SpringDamper().setSpring(0, 0);
    const transYSd = new j.SpringDamper().setSpring(0, 0);
    const transZSd = new j.SpringDamper().setSpring(0, 0);
    const rotXSd = new j.SpringDamper().setSpring(0, 0);
    const rotYSd = new j.SpringDamper().setSpring(0, 0);
    const rotZSd = new j.SpringDamper().setSpring(0, 0);

    config.translationalLimitMotors = [
      translXLimit,
      translYLimit,
      translZLimit,
    ];
    config.translationalSpringDampers = [transXSd, transYSd, transZSd];
    config.rotationalLimitMotors = [rotXLimit, rotYLimit, rotZLimit];
    config.rotationalSpringDampers = [rotXSd, rotYSd, rotZSd];

    const joint = new oimo.dynamics.constraint.joint.GenericJoint(config);
    this._physics.world.addJoint(joint);

    const rlm = joint.getRotationalLimitMotors();
    const tsd = joint.getTranslationalSpringDampers();
    return {
      joint,
      rotXLimit: rlm[0],
      rotYLimit: rlm[1],
      rotZLimit: rlm[2],
      transXSd: tsd[0],
      transYSd: tsd[1],
      transZSd: tsd[2],
    };
  }

  /**
   * @param {oimo.dynamics.rigidbody.RigidBody} a .
   * @param {oimo.dynamics.rigidbody.RigidBody} b .
   * @param {oimo.common.Vec3} anchor .
   */
  create_spherical_joint(a, b, anchor) {
    const j = oimo.dynamics.constraint.joint;
    const config = new j.SphericalJointConfig();
    config.init(a, b, anchor);
    config.springDamper.frequency = 4.0;
    config.springDamper.dampingRatio = 1.0;

    const joint = new j.SphericalJoint(config);
    this._physics.world.addJoint(joint);

    return joint;
  }
}

export default PhysicsUtils;
