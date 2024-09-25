/** @namespace Pages/Tests */

import * as THREE from "three";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { createFloorPlane } from "./utils.js";

/**
 * @class Environment1
 * @memberof Pages/Tests
 */
class Environment1 {
  constructor() {
    /** @type {LightsA} */
    this.lights = null;
  }

	/**
	 * @param {Object} [opts]
	 * @param {boolean} [opts.floor=true] makes floor plane
	 * @param {boolean} [opts.lights=true] enables lights
	 * @param {boolean} [opts.shadows=true] enables shadows
	 * @param {boolean} [opts.csm=false] enables cascaded shadow maps
	 */
  run(opts = { floor: true }) {
    const render = App.instance.render;
    const scene = render.scene;

    scene.background = new THREE.Color(0x66c0dc);
    this.lights = new LightsA().run(App.instance.render, opts);
    this.lights.lights.ambient.intensity = 1;
    this.lights.lights.directional.intensity = 1;
    this.lights.lights.hemisphere.intensity = 1;

    // floor
    if (opts?.floor) {
      const plane = createFloorPlane(1, true);
      scene.add(plane);
      this.plane = plane;
    }
  }

  stop() {
    this.lights.stop();
    this.lights = null;
  }
}

export default Environment1;
