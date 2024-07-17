/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../loader.js";
import LightsA from "../lights_a.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import { Vec3Up, dlerp, cache } from "../math.js";
import AdTestcaseBowling from "./ad_tc_bowling.js";
import { InputAction, InputsDualstick } from "../pawn/inputs_dualstick.js";
import CameraTopdown from "../pawn/camera_topdown.js";
import { Physics, RigidBodyType } from "../physics.js";
import logger from "../logger.js";

/**
 * @class AdPageTestcaseBowling
 * @memberof Pages/Tests
 */
class AdPageTestcaseBowling extends PageBase {
  constructor() {
    super();

    /** @type {AdTestcaseBowling} */
    this.testcase = null;

    /** @type {InputsDualstick} */
    this.inputs = null;

    /** @type {CameraTopdown} */
    this.camera_controls = null;

  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    this.testcase.step(dt);
    this.camera_controls.step(dt);
  }

  run() {
    App.instance.start(this.container.querySelector("render"));
    App.instance.spashscreen(true);

    const render = App.instance.render;
    const scene = render.scene;

    this.inputs = new InputsDualstick(
      this.container,
      this.container,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();

    this.testcase = new AdTestcaseBowling();
    this.testcase.run(() => {
      this._create_boxes();
      this._create_motors(cache.vec3.v0.set(2, 0.2, -3));
      this._create_motors(cache.vec3.v0.set(12, 0.3, -10));
      this._create_motors(cache.vec3.v0.set(-20, 0.4, 10));
      App.instance.spashscreen(false);
    });

    this.camera_controls = new CameraTopdown();
    this.camera_controls.init(render.camera, this.testcase.pawn.pawn_dbg_mesh);
  }

  input(type, start) {
    this.testcase.pawn.action(type, start);
  }

  /**
   * @param {number} x .
   * @param {number} x .
   * @param {string} tag .
   * @param {InputAction} type .
   */
  input_analog(x, y, tag, type) {
    const p = cache.vec3.v1;
    p.set(x, 0, y).applyAxisAngle(
      Vec3Up,
      this.camera_controls._camera.rotation.y,
    );
    this.testcase.pawn.action_analog(p.x, p.z, type);
  }

  /**
   * 
   * @param {THREE.Vector3} pos . 
   */
  _create_motors(pos) {
    const size = cache.vec3.v1;
    const _pos = cache.vec3.v2;
    _pos.copy(pos);
    size.set(0.5, 0.5, 0.5);
    const id1 = this.testcase.create_physics_box(
      pos,
      size,
      RigidBodyType.STATIC,
      null,
      0x000000,
    );
    _pos.x += 1;
    size.set(2, 0.4, 0.4);
    const id2 = this.testcase.create_physics_box(
      _pos,
      size,
      RigidBodyType.DYNAMIC,
      {
        density: 100,
      },
      0xffffff,
    );
    const b1 = this.testcase.physics.bodylist[id1];
    const b2 = this.testcase.physics.bodylist[id2];
    const motor = this.testcase.physics.create_joint_motor(b1, b2, null, {
      x: 5,
      y: 100,
    });
  }

  _create_boxes() {
    const BOX_SIZE = 1;
    const amount = 4;
    for (let x = 0; x < amount; x++) {
      for (let y = 0; y < amount; y++) {
        let i = x + (amount - 1 - y) * amount;
        let z = 0;
        let x1 = -10 + x * BOX_SIZE * 3 + Math.random() * 0.1;
        let y1 = 10;
        let z1 = 4 + (amount - 1 - y) * BOX_SIZE * 3 + Math.random() * 0.1;
        let w = BOX_SIZE * 1;
        let h = BOX_SIZE * 1;
        let d = BOX_SIZE * 1;
        const dynamic = Math.random() > 0.0;
        const type = dynamic ? RigidBodyType.DYNAMIC : RigidBodyType.STATIC;
        const color = dynamic ? 0xffffff : 0x000000;
        const id = this.testcase.create_physics_box(
          cache.vec3.v0.set(x1, y1, z1),
          cache.vec3.v1.set(w, h, d),
          type,
          color,
        );
        const body = this.testcase.physics.bodylist[id];
        const vel = this.testcase.physics.cache.vec3_0;
        vel.init(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        );
        body.setAngularVelocity(vel);
      }
    }
  }

  stop() {
    this.testcase.stop();
    this.inputs.stop();
    this.inputs = null;
    this.testcase = null;

    App.instance.pause();
  }
}

export default AdPageTestcaseBowling;
