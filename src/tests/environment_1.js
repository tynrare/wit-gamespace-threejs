/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { createFloorPlane } from "./utils.js";
import PawnDrawA from "../pawn/d240710_pawn.js";
import { dlerp, Vec3Up, cache } from "../math.js";
import AaTestcaseBowling from "./aa_tc_bowling.js";

/**
 * @class Environment1
 * @memberof Pages/Tests
 */
class Environment1 {
  constructor() {
    /** @type {LightsA} */
    this.lights = null;
  }

  run() {
    const render = App.instance.render;
    const scene = render.scene;

    scene.background = new THREE.Color(0x66c0dc);
    this.lights = new LightsA().run(App.instance.render);
    this.lights.lights.ambient.intensity = 1;
    this.lights.lights.directional.intensity = 1;
    this.lights.lights.hemisphere.intensity = 1;

    // floor
    {
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
