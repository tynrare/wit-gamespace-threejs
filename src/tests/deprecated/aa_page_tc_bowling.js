/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../../loader.js";
import LightsA from "../../lights_a.js";
import PageBase from "../../page_base.js";
import App from "../../app.js";
import { Vec3Up, dlerp, cache } from "../../math.js";
import AaTestcaseBowling from "./aa_tc_bowling.js";
import Environment1 from "../environment_1.js";
import { InputAction, InputsDualstick } from "../../pawn/inputs_dualstick.js";
import CameraTopdown from "../../pawn/camera_topdown.js";

/**
 * @class AbPageTestcaseBowling
 * @memberof Pages/Tests
 */
class AbPageTestcaseBowling extends PageBase {
  constructor() {
    super();

    /** @type {Environment1} */
    this.environment = null;

    /** @type {AaTestcaseBowling} */
    this.testcase = null;

    /** @type {InputsDualstick} */
    this.inputs = null;

    /** @type {CameraTopdown} */
    this.camera_controls = null;

    /** @type {THREE.Object3D} */
    this.playscene = null;

    this.attack = false;
    this.move = false;
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.testcase.step(dt);
    this.animate(dt);
    this.camera_controls.step(dt);
  }

  animate(dt) {
    const update_pointer = (mesh, visible) => {
      const pointer_size = this.testcase.pawn && visible ? 1 : 0;
      mesh.scale.setScalar(dlerp(mesh.scale.x, pointer_size, 1, dt * 1e-3));
      mesh.rotateY(3e-4 * dt);
    };
    update_pointer(this.pointer_mesh_a, this.move);
    update_pointer(this.pointer_mesh_b, this.attack);
  }

  run() {
    App.instance.start(this.container.querySelector("render"));

    const render = App.instance.render;
    const scene = render.scene;

    //render.pixelate(true);

    this.environment = new Environment1();
    this.environment.run({ floor: true });

    this.inputs = new InputsDualstick(
      this.container,
      this.container,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();

    this.camera_controls = new CameraTopdown();
    this.testcase = new AaTestcaseBowling();
    this.testcase.run(() => {
      const obj = this.testcase.pawn._target;
      this.camera_controls.init(render.camera, obj);
    });

    this.pointer_mesh_a = this.spawn_icosphere(0xb768e9);
    this.pointer_mesh_b = this.spawn_icosphere(0xb7e968);
    scene.add(this.pointer_mesh_a);
    scene.add(this.pointer_mesh_b);
  }

  input(type, start) {
    switch (type) {
      case InputAction.action_a:
        this.move = start;
        break;
      case InputAction.action_b:
        this.attack = start;
        if (this.testcase.pawn) {
          this.testcase.pawn.allow_move = !start;
        }
        break;
    }
  }

  /**
   * @param {number} x .
   * @param {number} x .
   * @param {string} tag .
   * @param {InputAction} type .
   */
  input_analog(x, y, tag, type) {
    if (!this.testcase?.pawn) {
      return;
    }
    const p = cache.vec3.v0;
    const ap = cache.vec3.v1;
    p.set(x, -0.1, y).applyAxisAngle(
      Vec3Up,
      this.camera_controls._camera.rotation.y,
    );
    const pawnpos = this.testcase.pawn._target.position;
    ap.copy(p).negate().add(pawnpos);

    this.testcase.set_goal(ap);
    switch (type) {
      case InputAction.action_a:
        this.pointer_mesh_a.position.copy(ap);
        break;
      case InputAction.action_b:
        this.pointer_mesh_b.position.copy(ap);
        this.camera_controls.zoom(p);
        break;
    }
  }

  /**
   * @returns {THREE.Mesh}
   */
  spawn_icosphere(color) {
    const geometry = new THREE.IcosahedronGeometry(0.1);
    const material = this.create_material(color);
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
  }

  create_material(color) {
    const material = new THREE.MeshPhongMaterial({
      color: color ?? 0xb768e9,
      emissive: 0x4f7e8b,
      shininess: 10,
      specular: 0xffffff,
    });

    return material;
  }

  stop() {
    this.testcase.stop();
    this.environment.stop();
    this.inputs.stop();
    this.environment = null;
    this.testcase = null;
    this.inputs = null;

    App.instance.pause();
  }
}

export default AbPageTestcaseBowling;
