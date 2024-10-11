/** @namespace Render */

import * as THREE from "three";
import logger from "./logger.js";
import { Vector2 } from "three";
import { Vec3Up } from "./math.js";
import { RenderConfig } from "./config.js";
import App from "./app.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import RenderUtils from "./render_utils.js";
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

export class RenderCache {
  constructor() {
    this.vec2_0 = new Vector2();
  }
}

/**
 * base threejs management class
 *
 * @class Render
 * @memberof Render
 */
class Render {
  constructor() {
    this.scale = 1;
    /** @type {THREE.Scene} */
    this.scene = null;
    /** @type {THREE.PerspectiveCamera} */
    this.camera = null;
    /** @type {THREE.WebGLRenderer} */
    this.renderer = null;
    /** @type {HTMLElement} */
    this.htmlcontainer = null;
    /** @type {EffectComposer} */
    this.composer = null;

    this.utils = new RenderUtils();

    this.cache = new RenderCache();
    /** @type {RenderConfig} */
    this.config = Object.create(RenderConfig);

    this.active = false;
  }

  init() {
    logger.log("Render initializing..");

    const scene = new THREE.Scene();
    this.scene = scene;

    logger.log("Render initialized.");

    return this;
  }

  /**
   * @param {HTMLElement} container .
   */
  run(container) {
    this.htmlcontainer = container;
    const renderer = new THREE.WebGLRenderer({
      antialias: App.instance.settings.antialias,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(this.viewport_w, this.viewport_h);
    renderer.shadowMap.enabled = this.config.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1;


    this.htmlcontainer.appendChild(renderer.domElement);

    this.renderer = renderer;
    this._equilizer();

    const camera = new THREE.PerspectiveCamera(
      this.config.camera_fov,
      this.viewport_w / this.viewport_h,
      0.1,
      1000,
    );
    camera.position.y = 5;
    camera.position.z = 5;
    camera.lookAt(0, 0, 0);
    this.camera = camera;
    this.set_camera_aspect();

    this.active = true;
    logger.log("Render ran.");
  }

  step(dt) {
    if (!this.active) {
      return;
    }

    this._equilizer();

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  stop() {
    this.active = false;
    this.scene?.clear();
    this.camera?.clear();
    this.renderer?.domElement?.parentElement?.removeChild(
      this.renderer.domElement,
    );
    this.renderer?.dispose();
    this.renderer = null;

    logger.log("Render stopped.");
  }

  dispose() {
    this.stop();
    this.scene?.clear();
    this.scene = null;
    this.camera?.clear();
    this.camera = null;

    logger.log("Render disposed.");
  }

  /**
   * @param {boolean|number} enable
   * @param gtao
   */
  pixelate(enable, { pixelate = true, gtao = false, bokeh = false } = {}) {
    if (!enable) {
      this.bokehPass = null;
      this.composer = null;
      this.scale = 1;

      return;
    }

    this.composer = new EffectComposer(this.renderer);

    if (pixelate) {
      this.scale = typeof enable == "number" ? enable : 0.5;
      this.scale /= this.renderer.getPixelRatio();

      const renderPixelatedPass = new RenderPixelatedPass(
        1,
        this.scene,
        this.camera,
      );
      renderPixelatedPass.normalEdgeStrength = 1;
      renderPixelatedPass.depthEdgeStrength = 1;
      this.composer.addPass(renderPixelatedPass);
    } else {
      const renderPass = new RenderPass( this.scene, this.camera );
      this.composer.addPass( renderPass );
    }

    if (gtao) {
      const renderGTAOPass = new GTAOPass(
        this.scene,
        this.camera,
        this.viewport_w,
        this.viewport_h,
      );
      renderGTAOPass.radius = 0.03;
      this.composer.addPass(renderGTAOPass);
    }

    if (bokeh) {
      const bokehPass = new BokehPass( this.scene, this.camera, {
        focus: 10.0,
        aperture: 0.0008,
        maxblur: 0.01
      } );
      this.bokehPass = bokehPass;
      this.composer.addPass(bokehPass);
    }

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  bokeh_focus(pos) {
    if (this.bokehPass) {
      this.bokehPass.uniforms['focus'].value = this.camera.position.distanceTo(pos);
    }
  }

  // ---

  get render_scale() {
    const scale = App.instance.settings.render_quality;
    return scale * this.scale;
  }

  get viewport_w() {
    return window.innerWidth * this.render_scale;
  }

  get viewport_h() {
    return window.innerHeight * this.render_scale;
  }

  /**
   * @private
   */
  _equilizer() {
    const size = this.renderer.getSize(this.cache.vec2_0);
    const w = this.viewport_w;
    const h = this.viewport_h;
    if (size.width != w || size.height != h) {
      this.renderer.setSize(w, h);
      this.composer?.setSize(w, h);
      this.set_camera_aspect(w, h);
    }
  }

  get_camera_fov_factor(width, height) {
    return Math.min(1, height / width);
  }

  set_camera_aspect(width = this.viewport_w, height = this.viewport_h) {
    this.camera.aspect = width / height;
    this.camera.fov =
      this.config.camera_fov * this.get_camera_fov_factor(width, height);
    this.camera.updateProjectionMatrix();
  }
}

export default Render;
