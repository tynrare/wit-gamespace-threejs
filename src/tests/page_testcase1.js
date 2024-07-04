/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from 'three/addons/controls/MapControls.js';
import { createFloorPlane } from "./utils.js";

/**
 * @class PageTestcase1
 * @memberof Pages/Tests
 */
class PageTestcase1 extends PageBase {
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
		const controls = new MapControls( render.camera, render.renderer.domElement );
		controls.enableDamping = true;
		this.controls = controls;
	}

  stop() {
		this.lights.stop();
		this.lights = null;
		this.controls = null;
		App.instance.pause();
	}
}

export default PageTestcase1;
