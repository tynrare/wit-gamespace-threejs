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

/**
 * @class PageTestcase3
 * @memberof Pages/Tests
 */
class PageTestcase3 extends PageBase {
  constructor() {
    super();

    /** @type {LightsA} */
    this.lights = null;

    /** @type {MapControls} */
    this.controls = null;

    /** @type {PawnDrawA} */
    this.pawn = null;
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.controls.update();
		if (this.pawn) {
			this.pawn.step(dt);
			this.animate(dt);
		}
  }

	animate(dt) {
		const dist_to_goal = cache.vec3.v0.copy(this.pawn._target.position).sub(this.pawn.goal).length();
		const pointer_size = dist_to_goal > 1 ? 1 : 0;
		this.pointer_mesh.scale.setScalar(dlerp(this.pointer_mesh.scale.x, pointer_size, 1, dt * 1e-3));
	}

  run() {
    App.instance.start(this.container.querySelector("render"));

    const render = App.instance.render;
    const scene = render.scene;

    render.pixelate(true);

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

    // camera controls
    const controls = new MapControls(render.camera, render.renderer.domElement);
    controls.enableDamping = true;
    this.controls = controls;

    this._load_pawn().then(() => {
      this.pawn = new PawnDrawA();
      this.pawn.init(this.character_gltf, this.character_scene);
      App.instance.render.scene.add(this.character_scene);
    });

		this.pointer_mesh = this.spawn_sphere();
		scene.add(this.pointer_mesh);

    this._poiterdown_event_listener = this._pointerdown.bind(this);
    this._poiterup_event_listener = this._pointerup.bind(this);
    this.container.addEventListener(
      "pointerdown",
      this._poiterdown_event_listener,
    );
    this.container.addEventListener("pointerup", this._poiterup_event_listener);
  }

  _pointerup(ev) {
    const x = ev.layerX;
    const y = ev.layerY;
    const len = Math.sqrt(
      Math.pow(x - this._pd_x, 2) + Math.pow(y - this._pd_y, 2),
    );

    if (len > 10) {
      return;
    }

    this._click(x, y);
  }

  _pointerdown(ev) {
    this._pd_x = ev.layerX;
    this._pd_y = ev.layerY;
  }

  _click(sx, sy) {
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    pointer.x = (sx / this.container.clientWidth) * 2 - 1;
    pointer.y = -(sy / this.container.clientHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, App.instance.render.camera);
    if (raycaster.ray.intersectPlane(new THREE.Plane(Vec3Up), cache.vec3.v0)) {
			this.pointer_mesh.position.copy(cache.vec3.v0);
			this.pawn.goal.copy(cache.vec3.v0);
    }
  }

  async _load_pawn() {
    this.character_gltf = await Loader.instance.get_gltf("bowling/pawn1.glb");
    this.character_scene = this.character_gltf.scene;
    this.character_scene.traverse((o) => {
      if (!o.isMesh) {
        return;
      }

      /** @type {THREE.Mesh} */
      const m = /** @type {any} */ (o);

      /** @type {THREE.MeshStandardMaterial} */
      const material = /** @type {any} */ (m.material);
      material.metalness = 0;

      this.lights.csm?.setupMaterial(material);

      o.castShadow = true;
    });
  }

	/**
	 * @returns {THREE.Mesh} 
	 */
	spawn_sphere() {
    const geometry = new THREE.SphereGeometry(0.3);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    });
    const mesh = new THREE.Mesh(geometry, material);

		return mesh;
	}

  stop() {
    this.lights.stop();
    this.pawn.dispose();
    this.pawn = null;
    this.lights = null;
    this.controls = null;
    this.character_scene = null;
    this.character_gltf = null;

    App.instance.render.pixelate(false);
    App.instance.pause();

    this.container.removeEventListener(
      "pointerdown",
      this._poiterdown_event_listener,
    );
    this.container.removeEventListener(
      "pointerup",
      this._poiterup_event_listener,
    );
    this._poiterdown_event_listener = null;
    this._poiterup_event_listener = null;
  }
}

export default PageTestcase3;
