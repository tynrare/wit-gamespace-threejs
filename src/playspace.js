/** @namespace Render */

import * as THREE from "three";
import Loader from "./loader.js";
import CameraTopdown from "./camera_topdown.js";
import PawnTankA from "./pawn_tank_a.js";
import { clamp } from "./math.js";
import Render from "./render.js";
import { RenderConfig } from "./config.js";
import LightsA from "./lights_a.js";

import { InputAction } from "./inputs.js";

/**
 * basic threejs stage
 *
 * @class Playspace
 * @memberof Render
 */
class Playspace {
  constructor() {
    /** @type {THREE.Scene} */
    this._scene = null;
    /** @type {THREE.Mesh} */
    this.cube = null;
    /** @type {THREE.Mesh} */
    this.plane = null;
    /** @type {CameraTopdown} */
    this.camera_controller = null;
    /** @type {PawnTankA} */
    this.pawn_controller = null;
    /** @type {LightsA} */
    this.lights = null;
  }

  /**
   * @param {THREE.Scene} scene .
   */
  init(scene) {
    this._scene = scene;
    this.camera_controller = new CameraTopdown();
    this.pawn_controller = new PawnTankA();

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
      this.add_gltf("scene.glb").then((scene) => {
        const conf = {};
        conf["Green_ostrov"] = "shadowmaps/GreenOstrovIllumination.png";
        conf["Ser_ostrov"] = "shadowmaps/SerOstrovIllumination.png";
        conf["Det"] = { channel: 1, path: "shadowmaps/DetIllumination.png" };
        conf["Trees_group_1"] = {
          channel: 1,
          path: "shadowmaps/Trees_group_1Illumination.png",
        };
        conf["Trees_group_2"] = {
          channel: 1,
          path: "shadowmaps/Trees_group_2Illumination.png",
        };
				console.log(JSON.stringify(conf));
        LightsA.apply_shadowmaps(scene, conf);
      });
      this.add_gltf("pawn.glb").then((scene) => {
        const pawn = scene.getObjectByName("Tank");

        this.camera_controller.set_target(pawn);
        this.pawn_controller.set_target(pawn);
      });
    }

    this.camera_controller.set_camera(render.camera);
    this.pawn_controller.set_camera(render.camera);

    return this;
  }

  add_gltf(url) {
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

      return gltf.scene;
    });
  }

  step(dt) {
    this.camera_controller.step(dt);
    this.pawn_controller.step(dt);
    this.lights.step();
  }

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input(action, start) {
    this.pawn_controller.input(action, start);
    const d = this.pawn_controller.direction;
    this.camera_controller.direction.set(d.x, d.y);
  }

  input_analog(x, y) {
    this.pawn_controller.input_analog(clamp(-1, 1, x), clamp(-1, 1, y));
    const d = this.pawn_controller.direction;
    this.camera_controller.direction.set(d.x, d.y);
  }

  stop() {
    this.cube?.removeFromParent();
    this.cube = null;
    this.plane?.removeFromParent();
    this.plane = null;
    this._scene.fog = null;
    this._scene.background = null;
    this.lights.stop();
  }

  dispose() {
    this.stop();
    this._scene = null;
    this.camera_controller?.cleanup();
    this.camera_controller = null;
    this.pawn_controller?.cleanup();
    this.pawn_controller = null;
  }
}

export default Playspace;
