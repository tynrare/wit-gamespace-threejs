/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../../loader.js";
import PageBase from "../../page_base.js";
import App from "../../app.js";
import LightsA from "../../lights_a.js";
import PawnDrawA from "../d240727_bowling/d240710_pawn.js";
import { dlerp, Vec3Up, cache } from "../../math.js";

/**
 * @class AaTestcaseBowling 
 * @memberof Pages/Tests
 */
class AaTestcaseBowling {
  constructor() {
    /** @type {PawnDrawA} */
    this.pawn = null;
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
		if (this.pawn) {
			this.pawn.step(dt);
		}
  }

  run(onload) {
    this._load_pawn().then(() => {
      this.pawn = new PawnDrawA();
      this.pawn.init(this.character_gltf, this.character_scene);
      App.instance.render.scene.add(this.character_scene);
			if (onload) {
				onload();
			}
    });
  }

	/** 
	 * @param {THREE.Vector3} pos
	 */
	set_goal(pos) {
		if (this.pawn) {
			this.pawn.goal.copy(pos);
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

      o.castShadow = true;
    });
  }

  stop() {
    this.pawn.dispose();
    this.pawn = null;
    this.character_scene = null;
    this.character_gltf = null;
  }
}

export default AaTestcaseBowling;
