/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../../loader.js";
import LightsA from "../../lights_a.js";
import PageBase from "../../page_base.js";
import App from "../../app.js";
import { Vec3Up, dlerp, cache } from "../../math.js";
import AdTestcaseBowling from "./ad_tc_bowling.js";
import { InputAction, InputsDualstick } from "../../pawn/inputs_dualstick.js";
import CameraTopdown from "../../pawn/camera_topdown.js";
import { Physics, RigidBodyType } from "../../physics.js";
import logger from "../../logger.js";

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
    App.instance.splashscreen(true);

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
      App.instance.splashscreen(false);
    });

    this.camera_controls = new CameraTopdown();
    this.camera_controls.config.distance = 10;
    this.camera_controls.config.height = 10;
    this.camera_controls.init(render.camera, this.testcase.pawn.pawn_dbg_mesh);
  }

  input(type, start) {
    this.testcase.pawn.action(type, start);
    this.camera_controls.zoom((type == InputAction.action_b) && start);
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
    return this.testcase.utils_create_motors(pos);
  }

  _create_boxes() {
    return this.testcase.utils_create_boxes();
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
