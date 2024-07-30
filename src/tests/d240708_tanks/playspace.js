/** @namespace Gamespace/Tanks */

import * as THREE from "three";
import App from "../../app.js";
import Loader from "../../loader.js";
import CameraTopdown from "./camera_topdown.js";
import PawnTankA from "./pawn_tank_a.js";
import ProjectilesSystem from "./projectiles_system.js";
import { clamp } from "../../math.js";
import Render from "../../render.js";
import LightsA from "../../lights_a.js";
import Navmesh from "../../navmesh.js";
import MovementSystem from "./movement_system.js";

import { InputAction } from "../../pawn/inputs_dualstick.js";

/**
 * threejs tanks scene
 *
 * @class PlayspaceTanks
 * @memberof Gamespace/Tanks
 */
class PlayspaceTanks {
  constructor() {
    /** @type {THREE.Scene} */
    this._scene = null;
    /** @type {THREE.Object3D} */
    this.playscene = null;
    /** @type {THREE.Mesh} */
    this.cube = null;
    /** @type {THREE.Mesh} */
    this.plane = null;
    /** @type {CameraTopdown} */
    this.camera_controller = null;
    /** @type {PawnTankA} */
    this.pawn_controller = null;
    /** @type {ProjectilesSystem} */
    this.projectiles_system = null;
    /** @type {LightsA} */
    this.lights = null;
    /** @type {Navmesh} */
    this.navmesh = null;
    /** @type {MovementSystem} */
    this.movement_system = null;

    this.cache = {
      v3: new THREE.Vector3(),
    };
  }

  /**
   * @param {THREE.Scene} scene .
   */
  init(scene) {
    this._scene = scene;
    this.camera_controller = new CameraTopdown();
    this.pawn_controller = new PawnTankA();
    this.navmesh = new Navmesh();
    this.movement_system = new MovementSystem().init(this.navmesh);
    this.projectiles_system = new ProjectilesSystem().init(
      scene,
      this.navmesh,
      this.movement_system,
    );

    return this;
  }

  /**
   * @param {Render} render .
	 * @param {string?} mapname
   */
  run(render, mapname) {
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
      const p1 = this.open_playscene(mapname ?? "b");
      const p2 = this.add_gltf("tanks/pawn.glb").then((scene) => {
        this.camera_controller.set_target(scene);
        this.pawn_controller.set_target(scene);
        LightsA.apply_lightmaps_white(scene);
      });

      const load_callback = () => {
        const pawn_entity = this.movement_system.add(
          {
            velocity: this.pawn_controller.velocity,
            torque: this.pawn_controller.torque,
          },
          this.pawn_controller._target,
        );

        const npoint = this.navmesh.register(
          this.pawn_controller._target.position,
        );
        this.pawn_controller.entity_id = pawn_entity.id;
				if (npoint) {
					pawn_entity.navmesh_id = npoint.id;
					npoint.mask = 0xff0000;
				}
      };
      Promise.all([p1, p2]).then(load_callback);
    }

    this.camera_controller.set_camera(render.camera);
    this.pawn_controller.set_camera(render.camera);
    this.pawn_controller.set_scene(this._scene);

    return this;
  }

  open_playscene(name, lightmaps = true) {
    return new Promise((resolve, reject) => {
      const root_path = `tanks/scenes/${name}/`;
      const load = (config) => {
        this.close_playscene();

        this.add_gltf(root_path + `scene.glb`).then((scene) => {
          this.playscene = scene;
          /** @type {THREE.Mesh} */
          const navmesh = /** @type {any} */ (scene.getObjectByName("navmesh"));
          if (navmesh) {
            navmesh.material.wireframe = true;
            this.navmesh.build(navmesh);
          }
          if (config) {
            LightsA.apply_lightmaps(scene, root_path, config);
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
		this.navmesh?.dispose();
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
        m.castShadow = App.instance.render.config.shadows;
        m.receiveShadow = App.instance.render.config.shadows;
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
    this.camera_controller.step(dt);
    this.pawn_controller.step(dt);
    this.lights.step();
    this.projectiles_system.step(dt);
    this.movement_system.step(dt);
  }

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input(action, start) {
    this.pawn_controller.input(action, start);
    const gun = this.pawn_controller.pawn_tank_gun_a;

    switch (action) {
      case InputAction.action_b:
        if (!start) {
          const pawn_entity =
            this.movement_system.entities[this.pawn_controller.entity_id];
          this.projectiles_system.spawn(
            pawn_entity.navmesh_id,
            gun.origin,
            gun.direction,
          );
          const dir = this.cache.v3.copy(gun.direction).negate();
          //dir.multiplyScalar(1e-1);
          this.pawn_controller.impulse.add(dir);
        }
        break;
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} tag
   */
  input_analog(x, y, tag) {
    this.pawn_controller.input_analog(clamp(-1, 1, x), clamp(-1, 1, y), tag);
  }

  stop() {
    this.plane?.removeFromParent();
    this.plane = null;
    this._scene.fog = null;
    this._scene.background = null;
    this.lights.stop();
    this.close_playscene();
    this.navmesh?.dispose();
  }

  dispose() {
    this.stop();
    this._scene = null;
    this.navmesh = null;
    this.camera_controller?.cleanup();
    this.camera_controller = null;
    this.pawn_controller?.cleanup();
    this.pawn_controller = null;
    this.projectiles_system?.dispose();
    this.projectiles_system = null;
    this.movement_system?.dispose();
    this.movement_system = null;
  }
}

export default PlayspaceTanks;
