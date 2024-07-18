/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import CameraThirdPerson from "../pawn/camera_third_person.js";
import { createFloorPlane } from "./utils.js";
import { Physics, RigidBodyType } from "../physics.js";
import { cache } from "../math.js";
import { Vector3 } from "three";
import { oimo } from "../lib/OimoPhysics.js";
import { InputAction, InputsDualstick } from "../pawn/inputs_dualstick.js";

class Wheel {
  constructor(body, motor_a, motor_b, motor_c, xpos) {
		/** @type {oimo.dynamics.rigidbody.RigidBody} */
    this.body = body;

    this.motor_a = motor_a;
    this.motor_b = motor_b;
    this.motor_c = motor_c;
		this.xpos = Math.sin(xpos);
  }
}

/**
 * @class BaPageTestcaseVehicle
 * @memberof Pages/Tests
 */
class BaPageTestcaseVehicle extends PageBase {
  constructor() {
    super();

    /** @type {LightsA} */
    this.lights = null;

    /** @type {CameraThirdPerson} */
    this.controls = null;

    /** @type {Physics} */
    this.physics = null;

    /** @type {InputsDualstick} */
    this.inputs = null;

    /** @type {Object<string, Wheel>} */
    this.wheels = {
      bl: null,
      br: null,
      fl: null,
      fr: null,
    };
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.controls.step(dt);
    this.physics.step(dt);
  }

  run() {
    App.instance.start(this.container.querySelector("render"));

    this.inputs = new InputsDualstick(
      this.container,
      this.container,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();

    const render = App.instance.render;
    const scene = render.scene;

    scene.background = new THREE.Color(0x66c0dc);
    this.lights = new LightsA().run(App.instance.render);

    // floor
    {
      const plane = createFloorPlane();
      scene.add(plane);
      this.plane = plane;
    }

    this.physics = new Physics().run({ fixed_step: false });

    // camera controls
    const controls = new CameraThirdPerson();
    controls.set_camera(render.camera);
    this.controls = controls;

    this.create_environment_box();
    this.create_vehicle();
  }

  input(type, start) {}

  /**
   * @param {number} x .
   * @param {number} x .
   * @param {string} tag .
   * @param {InputAction} type .
   */
  input_analog(x, y, tag, type) {
    switch (type) {
      case InputAction.action_a:
        for (const k in this.wheels) {
          const w = this.wheels[k];
					const rx = -x;
          w.motor_a.setMotor(-y * 16 + (w.xpos * 2 - rx) * rx * 4, 10);
					w.body.wakeUp();
        }
        break;
      case InputAction.action_b:
        break;
    }
  }

  create_environment_box() {
    this.physics.create_box(
      new Vector3(0, -1, 0),
      new Vector3(100, 2, 100),
      RigidBodyType.STATIC,
    );

		const size = 40;
    this.physics.utils.create_physics_box(
      new Vector3(0, 0, size / 2),
      new Vector3(size, 2, 2),
      RigidBodyType.STATIC,
    );
    this.physics.utils.create_physics_box(
      new Vector3(0, 0, -size / 2),
      new Vector3(size, 2, 2),
      RigidBodyType.STATIC,
    );
    this.physics.utils.create_physics_box(
      new Vector3(size / 2, 0, 0),
      new Vector3(2, 2, size),
      RigidBodyType.STATIC,
    );
    this.physics.utils.create_physics_box(
      new Vector3(-size / 2, 0, 0),
      new Vector3(2, 2, size),
      RigidBodyType.STATIC,
    );
  }

  create_vehicle() {
    const pos = cache.vec3.v0.set(0, 1, 0);
    const size = cache.vec3.v1.set(1, 0.5, 2);

    const body_id = this.physics.utils.create_physics_box(
      pos,
      size,
      RigidBodyType.DYNAMIC,
      {
        density: 5,
      },
    );
    const mesh = this.physics.meshlist[body_id];
    const body = this.physics.bodylist[body_id];

    this.controls.set_target(mesh);

    // wheel
    /*
    pos.set(0.0, 1, 0.7);
    const wheel_backroot = this.create_wheel_root(pos, body);
    pos.set(0.0, 1, -0.7);
    const wheel_frontroot = this.create_wheel_root(pos, body);
		this.wheel_backroot = wheel_backroot;
		this.wheel_frontroot = wheel_frontroot;
		*/

    pos.set(0.7, 1, 0.7);
    this.wheels.bl = this.create_wheel(pos, body, 1);
    pos.set(-0.7, 1, 0.7);
    this.wheels.br = this.create_wheel(pos, body, 1);
    pos.set(0.7, 1, -0.7);
    this.wheels.fl = this.create_wheel(pos, body, 1);
    pos.set(-0.7, 1, -0.7);
    this.wheels.fr = this.create_wheel(pos, body, 1);
  }

  create_wheel(pos, root) {
    const size = cache.vec3.v1;
    const axis = this.physics.cache.vec3_0;
    size.set(0.5, 0.2, 0);
    const wheel_id = this.physics.utils.create_physics_cylinder(
      pos,
      size,
      RigidBodyType.DYNAMIC,
      {
        density: 1,
        adamping: 5,
        ldamping: 1,
				friction: 2
      },
    );
		const wheel_body = this.physics.bodylist[wheel_id];
    const rot = this.physics.cache.vec3_0;
    rot.init(0, 0, Math.PI / 2);
    wheel_body.rotateXyz(rot);

    axis.init(1, 0, 0);
    /*
    this.physics.create_joint_motor(root, wheel_body, wheel_body.getPosition(), axis, {
      speed: 4,
      torque: 10,
    });
		*/
    const opts = this.create_wheel_joint(root, wheel_body, wheel_body.getPosition());
    const wheel = new Wheel(
      wheel_body,
      opts.rotXLimit,
      opts.rotYLimit,
      opts.rotZLimit,
			pos.x
    );

    return wheel;
  }

  create_wheel_joint(a, b, anchor) {
    const j = oimo.dynamics.constraint.joint;
    const config = new j.GenericJointConfig();
    config.init(a, b, anchor, new oimo.common.Mat3(), new oimo.common.Mat3());
    var rotXLimit = new j.RotationalLimitMotor();
    rotXLimit.setMotor(-0, 10);
    var rotYLimit = new j.RotationalLimitMotor().setLimits(0, 0);
    var rotZLimit = new j.RotationalLimitMotor().setLimits(0, 0);
    var translXLimit = new j.TranslationalLimitMotor().setLimits(0, 0);
    var translYLimit = new j.TranslationalLimitMotor().setLimits(-0.1, 0.1);
    var translZLimit = new j.TranslationalLimitMotor().setLimits(0, 0);
		const rotXSd = new j.SpringDamper().setSpring(0, 0);
		const rotYSd = new j.SpringDamper().setSpring(0, 0);
		const rotZSd = new j.SpringDamper().setSpring(0, 0);

    config.translationalLimitMotors = [
      translXLimit,
      translYLimit,
      translZLimit,
    ];
    config.rotationalLimitMotors = [rotXLimit, rotYLimit, rotZLimit];
		config.rotationalSpringDampers = [
			rotXSd,
			rotYSd,
			rotZSd
		]

    const joint = new oimo.dynamics.constraint.joint.GenericJoint(config);
    this.physics.world.addJoint(joint);

    const rlm = joint.getRotationalLimitMotors();
    return { joint, rotXLimit: rlm[0], rotYLimit: rlm[1], rotZLimit: rlm[2] };
  }

  /**
   * disabled: oimo couldn't handle joints chains properly for this case
   */
  create_wheel_root(pos, body) {
    const size = cache.vec3.v1;
    size.set(1.4, 0.1, 0.1);
    const wheel_root = this.physics.create_box(
      pos,
      size,
      RigidBodyType.DYNAMIC,
      {
        density: 10,
        adamping: 10,
        ldamping: 1,
      },
    );
    const axis = this.physics.cache.vec3_0;
    axis.init(0, 1, 0);
    this.create_joint_cylindrical(
      body,
      wheel_root,
      wheel_root.getPosition(),
      axis,
    );

    return wheel_root;
  }

  create_joint_cylindrical(a, b, anchor, axis, torque = 0) {
    const config = new oimo.dynamics.constraint.joint.CylindricalJointConfig();
    const _axis = this.physics.cache.vec3_0;
    _axis.init(axis?.x ?? 0, axis?.y ?? 1, axis?.z ?? 0);
    config.init(a, b, anchor, _axis);

    const rmotor = new oimo.dynamics.constraint.joint.RotationalLimitMotor();
    const tmotor = new oimo.dynamics.constraint.joint.TranslationalLimitMotor();
    tmotor.setLimits(-0.1, 0.1);
    rmotor.setLimits(0, 0);

    const rsd = new oimo.dynamics.constraint.joint.SpringDamper();
    const tsd = new oimo.dynamics.constraint.joint.SpringDamper();
    rsd.setSpring(0, 1);
    tsd.setSpring(0, 1);

    config.rotationalSpringDamper = rsd;
    config.translationalSpringDamper = tsd;
    config.rotationalLimitMotor = rmotor;
    config.translationalLimitMotor = tmotor;

    const joint = new oimo.dynamics.constraint.joint.CylindricalJoint(config);
    this.physics.world.addJoint(joint);

    return joint;
  }

  stop() {
    this.lights.stop();
    this.lights = null;
    this.controls = null;
    this.inputs.stop();
    this.inputs = null;
    App.instance.pause();
  }
}

export default BaPageTestcaseVehicle;
