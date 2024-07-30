/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { createFloorPlane } from "./utils.js";
import { cache } from "../math.js";
import { Navmesh, NavmeshPoint } from "../navmesh.js";
import InputsMap from "../pawn/inputs_map.js";

class Vertex {
  constructor(x, y, z, r = 1, g = 1, b = 1) {
    this.pos = new THREE.Vector3(x, y, z);
    this.color = mathcache.color0.set(r ?? 1, g ?? 1, b ?? 1).getHex();
  }
}

/**
 * @class PageTestcase5Navmesh
 * @memberof Pages/Tests
 */
class PageTestcase5Navmesh extends PageBase {
  constructor() {
    super();

    /** @type {LightsA} */
    this.lights = null;

    /** @type {MapControls} */
    this.controls = null;

    /** @type {NavmeshPoint} */
    this.pawn_npoint = null;

    /** @type {THREE.Mesh} */
    this.pawn_model = null;

    /** @type {Navmesh} */
    this.navmesh = null;

    /** @type {InputsMap} */
    this.inputs = null;
  }

  /**
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
    const controls = new MapControls(render.camera, render.renderer.domElement);
    controls.enableDamping = true;
    this.controls = controls;

    this.navmesh = new Navmesh();
    const mesh = Loader.instance
      .get_gltf("test/test_navmesh0.glb")
      .then((gltf) => {
        const s = gltf.scene;
        scene.add(s);
        s.position.y = 1;
        const m = s.children[0];
        m.material.wireframe = true;
        this.navmesh.build(m);

        this.pawn_npoint = this.navmesh.register(new THREE.Vector3(0, 0, 0));
      });
  }

  stop() {
    this.lights.stop();
    this.lights = null;
    this.controls = null;
    this.navmesh.dispose();
    this.navmesh = null;
    App.instance.pause();
  }
}

export default PageTestcase5Navmesh;
