/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../loader.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { cache } from "../math.js";
import { Physics, RigidBodyType } from "../physics.js";
import Environment1 from "./environment_1.js";
import AdTestcaseBowlingPawn from "./ad_tc_bowling_pawn.js"

/**
 * @class AdTestcaseBowling
 * @memberof Pages/Tests
 */
class AdTestcaseBowling {
  constructor() {
    /** @type {AdTestcaseBowlingPawn} */
    this.pawn = null;

    /** @type {Physics} */
    this.physics = null;

    /** @type {THREE.Object3D} */
    this.playscene = null;

    /** @type {Environment1} */
    this.environment = null;

    this.cache = {
      vec3_0: new Vector3(),
    };
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    this.physics.step(dt);
    this.pawn.step(dt);
  }

  run(onload) {
    this.environment = new Environment1();
    this.environment.run({ floor: false });

    this.physics = new Physics().run({ fixed_step: false });
    this.physics.create_box(
      new Vector3(0, -1, 0),
      new Vector3(100, 2, 100),
      RigidBodyType.STATIC,
    );

    this.pawn = new AdTestcaseBowlingPawn();
    Promise.all([
      this.pawn.run(this.physics).load(),
      this.open_playscene("a"),
    ]).then(() => {
      if (onload) {
        onload();
      }
    });
  }

  open_playscene(name, lightmaps = true) {
    const render = App.instance.render;

    return new Promise((resolve, reject) => {
      const root_path = `bowling/scenes/${name}/`;
      const load = (config) => {
        this.close_playscene();

        Loader.instance.get_gltf(root_path + `scene.glb`).then((gltf) => {
          const scene = gltf.scene;
          render.scene.add(scene);
          this.playscene = scene;
          /** @type {THREE.Mesh} */
          if (config) {
            LightsA.apply_lightmaps(scene, root_path, config);
          }
          LightsA.apply_lightmaps_white(scene);

          this.parse_playscene(scene);

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

  /**
   * @param {THREE.Object3D} scene .
   */
  parse_playscene(scene) {
    scene.traverse((o) => {
      /** @type {THREE.Mesh} */
      const m = /** @type {any} */ (o);
      if (!m.isMesh) {
        return;
      }
      if (!m.name.includes("phys")) {
        return;
      }
      const bb = m.geometry.boundingBox;
      const size = bb.getSize(cache.vec3.v0);
      const center = bb.getCenter(cache.vec3.v1);
      const pos = m.getWorldPosition(cache.vec3.v2);
      pos.add(center);
      const type = m.name.includes("dynamic")
        ? RigidBodyType.DYNAMIC
        : RigidBodyType.STATIC;
      const body = this.physics.create_box(pos, size, type);
      //this.physics.attach(body, m);
    });
  }

  create_material(color) {
    return App.instance.render.utils.create_material0(color);
  }

  /**
   * Creates box with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {number} color .
   * @returns {string} body id
   */
  create_physics_box(pos, size, type, color = 0xffffff) {
    return this.physics.utils.create_physics_box(pos, size, type, null, color);
  }

  /**
   * Creates sphere with mesh
   * @param {Vector3} pos .
   * @param {number} sphere .
   * @param {RigidBodyType} type .
   * @param {object} [opts] .
   * @param {boolean} [opts.icosphere] .
   * @param {number} [color=0xffffff] .
   * @returns {string} body id
   */
  create_physics_sphere(pos, radius, type, opts, color = 0xffffff) {
    return this.physics.utils.create_physics_sphere(pos, radius, type, null, color);
  }

  /**
   * Creates cylinder with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {object?} [opts] .
   * @param {number} [opts.friction=1] .
   * @param {number} [color] .
   * @returns {string} body id
   */
  create_physics_cylinder(pos, size, type, opts, color = 0xffffff) {
    return this.physics.utils.create_physics_cylinder(pos, size, type, null, color);
  }

  stop() {
    this.pawn.dispose();
    this.environment.stop();
    this.pawn = null;
    this.character_scene = null;
    this.character_gltf = null;
    this.environment = null;
    this.close_playscene();
  }
}

export default AdTestcaseBowling;
