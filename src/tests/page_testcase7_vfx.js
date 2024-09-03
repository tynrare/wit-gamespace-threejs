/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { createFloorPlane } from "./utils.js";
import {
  DitheredOpacity,
  NoiseDisplace,
  RimGlow,
  ExtendedMaterial,
  get_material_blob_a,
  get_material_hza,
  update_shaders,
} from "../vfx/shaders.js";

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

    /** @type {ExtendedMaterial} */
    this.test_extmat = null;
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.controls.update();
    update_shaders();
    this.test_extmat.noiseTime += dt * 1e-3;
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
    this.create_test_blob_mesh();
    this.create_test_extendmat_mesh();
  }

  create_test_blob_mesh() {
    let geometry = new THREE.CylinderGeometry();
    let material = get_material_blob_a(
      Loader.instance.get_texture("tex_noise0.png"),
      { blob_size: 0.3, wave_scale: 1 },
    );

    let mesh = new THREE.Mesh(geometry, material);
    App.instance.render.scene.add(mesh);

    mesh.position.y = 1;
    mesh.position.x = 1;
  }

  create_test_extendmat_mesh() {
    let geometry = new THREE.SphereGeometry();
    const material = (this.test_extmat = get_material_hza({
      dither: {},
      glow: { glowColor: new THREE.Color(0xff0000) },
      noise: {},
    }));
    let mesh = new THREE.Mesh(geometry, material);
    App.instance.render.scene.add(mesh);

    mesh.position.y = 1;
    mesh.position.x = 4;
  }

  create_test_extend_material() {
    // https://github.com/leoncvlt/three-extended-material/blob/master/examples/complex/index.js#L40
    const extensions = {
      dither: true,
      glow: true,
      noise: true,
    };
    const props = {
      dither: {
        opacity: 0.5,
      },
      glow: {
        glowIntensity: 1.0,
        glowColor: { r: 0, g: 1, b: 0.6 },
        glowPower: 1.0,
      },
      noise: {},
    };
    const extensionObjects = {
      dither: DitheredOpacity,
      glow: RimGlow,
      noise: NoiseDisplace,
    };

    const _extensions = Object.keys(extensions)
      .filter((e) => !!extensions[e])
      .map((e) => extensionObjects[e]);
    const _props = Object.values(props).reduce(
      (accumulator, extensionProps) => ({
        ...accumulator,
        ...extensionProps,
      }),
    );

    const material = new ExtendedMaterial(
      THREE.MeshStandardMaterial,
      _extensions,
      _props,
    );

    return material;
  }

  stop() {
    this.lights.stop();
    this.lights = null;
    this.controls = null;
    App.instance.pause();
  }
}

export default PageTestcase7Vfx;
