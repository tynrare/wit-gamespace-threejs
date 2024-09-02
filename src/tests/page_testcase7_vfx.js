/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { createFloorPlane } from "./utils.js";
import { get_material_blob_a, update_shaders } from "../vfx/shaders.js";

/**
 * @class PageTestcase7Vfx
 * @memberof Pages/Tests
 */
class PageTestcase7Vfx extends PageBase {
  constructor() {
    super();

    /** @type {LightsA} */
    this.lights = null;

    /** @type {MapControls} */
    this.controls = null;
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.controls.update();
		update_shaders();
  }

  run() {
    App.instance.start(this.container.querySelector("render"));

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

    // camera controls
    const controls = new MapControls(render.camera, render.renderer.domElement);
    controls.enableDamping = true;
    this.controls = controls;

		this.create_test_meshes();
  }

  create_test_meshes() {
    let geometry = new THREE.CylinderGeometry();
    let material = get_material_blob_a(
      Loader.instance.get_texture("tex_noise0.png"),
			5
    );

    let mesh = new THREE.Mesh(geometry, material);
    App.instance.render.scene.add(mesh);

    mesh.position.y = 1;
  }

  stop() {
    this.lights.stop();
    this.lights = null;
    this.controls = null;
    App.instance.pause();
  }
}

export default PageTestcase7Vfx;
