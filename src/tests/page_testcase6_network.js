/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from 'three/addons/controls/MapControls.js';
import { createFloorPlane } from "./utils.js";
import Network from "../network.js";

/**
 * @class PageTestcase6Network
 * @memberof Pages/Tests
 */
class PageTestcase6Network extends PageBase {
  constructor() {
		super();

		/** @type {LightsA} */
    this.lights = null;

		/** @type {MapControls} */
		this.controls = null;

		/** @type {Network} */
		this.network = null;
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

		this.network = new Network().init().run();
	}

  stop() {
		this.lights.stop();
		this.lights = null;
		this.controls = null;
		this.network.dispose();
		this.network = null;
		App.instance.pause();
	}
}

export default PageTestcase6Network;
