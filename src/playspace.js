/** @namespace Gamespace */

import * as THREE from "three";
import Loader from "./loader.js";
import { clamp } from "./math.js";
import Render from "./render.js";
import { RenderConfig } from "./config.js";
import LightsA from "./lights_a.js";

import { InputAction } from "./inputs.js";

/**
 * basic threejs stage
 *
 * @class Playspace
 * @memberof Gamespace
 */
class Playspace {
  constructor() {
    /** @type {THREE.Scene} */
    this._scene = null;
    /** @type {THREE.Object3D} */
    this.playscene = null;
    /** @type {THREE.Mesh} */
    this.cube = null;
    /** @type {THREE.Mesh} */
    this.plane = null;

    this.cache = {
      v3: new THREE.Vector3(),
    };
  }

  /**
   * @param {THREE.Scene} scene .
   */
  init(scene) {
    this._scene = scene;

    return this;
  }

  /**
   * @param {Render} render .
   */
  run(render) {
    // fog
    //this._scene.fog = new THREE.Fog( 0x66c4c4, 10, 150 );
    this._scene.background = new THREE.Color(0x66c0dc);

    this.lights = new LightsA().run(render);

    // floor
    {
      const repeats = 64;
      const geometry = new THREE.PlaneGeometry(repeats * 8, repeats * 8);
      const texture = Loader.instance.get_texture("tex0.png");
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeats, repeats);
      const material = new THREE.MeshToonMaterial({
        map: texture,
      });
      const plane = new THREE.Mesh(geometry, material);
      plane.position.z -= 2;
      plane.receiveShadow = true;
      this._scene.add(plane);
      this.plane = plane;
    }

    // scene
    {
    }

    return this;
  }

  open_playscene(name, lightmaps = true) {
    return new Promise((resolve, reject) => {
      const root_path = `scenes/${name}/`;
      const load = (config) => {
        this.close_playscene();

        this.add_gltf(root_path + `scene.glb`).then((scene) => {
          this.playscene = scene;
          if (config) {
            LightsA.apply_lightmaps(scene, config);
          }
          LightsA.apply_lightmaps_white(scene);

          resolve();
        });
      };

      if (lightmaps) {
        Loader.instance
          .get_json(root_path + `lightmaps/config.json`)
          .then((config) => {
            load(config);
          });
      } else {
        load(null);
      }
    });
  }

  close_playscene() {
    this.playscene?.removeFromParent();
    this.playscene = null;
  }

  add_gltf(url, add_to_scene = true) {
    return Loader.instance.get_gltf(url).then((gltf) => {
      console.log(gltf);
      /** @type {THREE.Object3D} */
      const scene = gltf.scene;
      scene.traverse((o) => {
        /** @type {THREE.Mesh} */
        const m = /** @type {any} */ (o);
        if (!m.isMesh) {
          return;
        }
        m.castShadow = RenderConfig.instance.shadows;
        m.receiveShadow = RenderConfig.instance.shadows;
        /** @type {THREE.MeshStandardMaterial} */
        const material = /** @type {any} */ (m.material);
        material.metalness = 0;

        this.lights.csm?.setupMaterial(material);
      });

      this._scene.add(scene);

      return scene;
    });
  }

  step(dt) {
    this.lights.step();
  }

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input(action, start) {
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} tag
   */
  input_analog(x, y, tag) {
  }

  stop() {
    this.plane?.removeFromParent();
    this.plane = null;
    this._scene.fog = null;
    this._scene.background = null;
    this.lights.stop();
    this.close_playscene();
  }

  dispose() {
    this.stop();
    this._scene = null;
  }
}

export default Playspace;
