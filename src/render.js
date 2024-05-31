/** @namespace Render */

import * as THREE from "three";
import logger from "./logger.js";
import { Vector2 } from "three";
import { RenderConfig } from "./config.js";

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
    /** @type {THREE.Scene} */
    this.scene = null;
    /** @type {THREE.PerspectiveCamera} */
    this.camera = null;
    /** @type {THREE.WebGLRenderer} */
    this.renderer = null;

    this.cache = new RenderCache();
    this.config = new RenderConfig();

    this.active = false;
  }

  init() {
    logger.log("Render initializing..");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      this.viewport_w / this.viewport_h,
      0.1,
      1000,
    );
    camera.position.y = -5;
    camera.position.z = 5;
    camera.lookAt(0, 0, 0);

    this.scene = scene;
    this.camera = camera;

    logger.log("Render initialized.");

    return this;
  }

  run() {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(this.viewport_w, this.viewport_h);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    this.renderer = renderer;
    this._equilizer();

    this.active = true;
    logger.log("Render ran.");
  }

  step(dt) {
    if (!this.active) {
      return;
    }

    this._equilizer();

    this.renderer.render(this.scene, this.camera);
  }

  stop() {
    this.active = false;
    this.renderer?.domElement?.parentElement?.removeChild(
      this.renderer.domElement,
    );
    this.renderer?.dispose();
    this.renderer = null;
  }

  dispose() {
    this.stop();
    this.scene?.clear();
    this.scene = null;
    this.camera?.clear();
    this.camera = null;
  }

  // ---

  get viewport_w() {
    return window.innerWidth;
  }

  get viewport_h() {
    return window.innerHeight;
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
      this.set_camera_aspect(w, h);
    }
  }

  set_camera_aspect(width = this.viewport_w, height = this.viewport_h) {
    this.camera.aspect = width / height;
    this.camera.fov = this.config.camera_fov * Math.min(1, width / height);
    this.camera.updateProjectionMatrix();
  }
}

export default Render;
