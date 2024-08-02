/** @namespace Render */

import * as THREE from "three";
import logger from "./logger.js";
import Stats from "./stats.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import App from "./app.js";

/**
 * @class
 * @memberof Render
 */
class LoaderCache {
  constructor() {
    this.guids = 0;
    this.textures = {};
    this.gltfs = {};
    this.loading_gltfs = {};
  }
}

/**
 * @class
 * @memberof Render
 */
class Loader {
  static _instance;

  constructor() {
    this.loadings = 0;
    this.cache = new LoaderCache();
    this._gltf_loader = new GLTFLoader();
  }

  /**
   * @returns {Loader} .
   */
  static get instance() {
    if (!Loader._instance) {
      Loader._instance = new Loader();
    }

    return Loader._instance;
  }

  /**
   * @param {string} url .
   * @returns {Promise<object>} .
   * @throws error
   */
  async get_json(url) {
    this.notify_loading();
    return fetch(url)
      .then((response) => response.json())
      .then((data) => {
        this.confirm_loading();
        return data;
      })
      .catch((error) => {
        this.confirm_loading(true);
        logger.warn("Loader::get_json error:", error);
      });
  }

  /**
   * @param {string} url .
   * @returns {THREE.Texture} .
   */
  get_texture(url, pixelate = false, cloned = false) {
    const postprocess_texture = (texture) => {
      if (pixelate) {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
      } else {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
      }
      texture.generateMipmaps = !pixelate;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;

      return texture;
    };
    if (this.cache.textures[url]) {
      logger.log(`Loader::get_texture texture ${url} fetched from cache..`);
      const t = this.cache.textures[url];
      const texture = cloned ? t.clone() : t;
      // should be cloned probably
      return postprocess_texture(texture);
    }

    this.notify_loading();

    logger.log(`Loader::get_texture texture ${url} loading..`);
    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      url,
      () => {
        this.confirm_loading();
        logger.log(`Loader::get_texture texture ${url} loaded.`);
      },
      (xhr) => {},
      (error) => {
        this.confirm_loading(true);
        logger.error(`Loader::get_texture texture error: `, error);
      },
    );
    this.cache.textures[url] = texture;

    return postprocess_texture(texture);
  }

  /**
   * @param {string} url .
   * @returns {Promise<any>} gltf data
   * @throws error
   */
  get_gltf(url) {
    const promise = (this.cache.loading_gltfs[url] =
      this.cache.loading_gltfs[url] ??
      new Promise((resolve, reject) => {
        if (this.cache.gltfs[url]) {
          logger.log(`Loader::get_gltf gltf ${url} fetched from cache..`);
          this.cache.loading_gltfs[url] = null;
          resolve(this.cache.gltfs[url]);
          return;
        }

        this.notify_loading();
        logger.log(`Loader::get_gltf gltf ${url} loading..`);
        this._gltf_loader.load(
          url,
          (gltf) => {
            this.confirm_loading();
            logger.log(`Loader::get_gltf gltf ${url} loaded.`);
            this.cache.gltfs[url] = gltf;
            this._prepare_gltf(gltf);
            this.cache.loading_gltfs[url] = null;
            resolve(gltf);
          },
          (xhr) => {},
          (error) => {
            this.confirm_loading(true);
            logger.error(`Loader::get_gltf gltf error: `, error);
            reject(error);
          },
        );
      }));

    return promise;
  }

  _prepare_gltf(gltf) {
    /** @type {THREE.Object3D} */
    const scene = gltf.scene;
    scene.traverse((o) => {
      /** @type {THREE.Mesh} */
      const m = /** @type {any} */ (o);
      if (!m.isMesh) {
        return;
      }
      m.castShadow = App.instance.render?.config.shadows ?? false;
      m.receiveShadow = App.instance.render?.config.shadows ?? false;
      //this.environment.lights.csm?.setupMaterial(material);
      /** @type {THREE.MeshStandardMaterial} */
      const material = /** @type {any} */ (m.material);
      material.metalness = 0;
    });
  }

  notify_loading() {
    this.loadings += 1;
    Stats.instance.show_loading(this.loadings > 0);
  }

  confirm_loading(error = false) {
    this.loadings -= 1;
    Stats.instance.show_loading(this.loadings > 0);
  }
}

export { Loader, LoaderCache };
export default Loader;
