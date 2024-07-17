/** @namespace Pages/Tests */

import * as THREE from "three";
import PageBase from "../page_base.js";
import App from "../app.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { dlerp, cache } from "../math.js";
import AaTestcaseBowling from "./deprecated/aa_tc_bowling.js";
import Environment1 from "./environment_1.js";
import { InputsMap } from "../pawn/inputs_map.js";

/**
 * @class PageTestcase3
 * @memberof Pages/Tests
 */
class PageTestcase3 extends PageBase {
  constructor() {
    super();

    /** @type {Environment1} */
    this.environment = null;

    /** @type {MapControls} */
    this.controls = null;

    /** @type {AaTestcaseBowling} */
    this.testcase = null;

    /** @type {InputsMap} */
    this.inputs = null;
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.controls.update();
    this.testcase.step(dt);
    this.animate(dt);
  }

  animate(dt) {
    let dist_to_goal = Infinity;
    if (this.testcase.pawn) {
      dist_to_goal = cache.vec3.v0
        .copy(this.testcase.pawn._target.position)
        .sub(this.testcase.pawn.goal)
        .length();
    }
    const pointer_size = dist_to_goal > 1 ? 1 : 0;
    this.pointer_mesh.scale.setScalar(
      dlerp(this.pointer_mesh.scale.x, pointer_size, 1, dt * 1e-3),
    );
		this.pointer_mesh.rotateY(3e-4 * dt);
  }

  run() {
    App.instance.start(this.container.querySelector("render"));

    this.testcase = new AaTestcaseBowling();
    this.testcase.run();

    const render = App.instance.render;
    const scene = render.scene;

    render.pixelate(true);

    this.environment = new Environment1();
    this.environment.run();

    this.inputs = new InputsMap(
      this.container,
      render,
      null,
      this.input_analog.bind(this),
    );
    this.inputs.run();

    // camera controls
    const controls = new MapControls(render.camera, render.renderer.domElement);
    controls.enableDamping = true;
    this.controls = controls;

    this.pointer_mesh = this.spawn_icosphere();
    scene.add(this.pointer_mesh);
  }

  input_analog(x, y, arg) {
    const p = cache.vec3.v0;
    p.set(x, 0, y);
    this.pointer_mesh.position.copy(p);
    this.testcase.set_goal(p);
  }

  /**
   * @returns {THREE.Mesh}
   */
  spawn_icosphere() {
    const geometry = new THREE.IcosahedronGeometry(0.3);
    const material = new THREE.MeshPhongMaterial({
      color: 0xb768e9,
      emissive: 0x4f7e8b,
      shininess: 10,
      specular: 0xffffff,
    });
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
  }

  stop() {
    this.testcase.stop();
    this.environment.stop();
    this.inputs.stop();
    this.environment = null;
    this.controls = null;
    this.testcase = null;
    this.inputs = null;

    App.instance.render.pixelate(false);
    App.instance.pause();
  }
}

export default PageTestcase3;
