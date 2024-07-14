/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../loader.js";
import LightsA from "../lights_a.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import { Vec3Forward, Vec3Right, Vec3Up, dlerp, cache } from "../math.js";
import AaTestcaseBowling from "./aa_tc_bowling.js";
import Environment1 from "./environment_1.js";
import { InputAction, InputsDualstick } from "../pawn/inputs_dualstick.js";
import CameraTopdown from "../pawn/camera_topdown.js";
import { Physics, RigidBodyType } from "../physics.js";
import logger from "../logger.js";

/**
 * @class AaPageTestcaseBowling
 * @memberof Pages/Tests
 */
class AaPageTestcaseBowling extends PageBase {
  constructor() {
    super();

    /** @type {Environment1} */
    this.environment = null;

    /** @type {AaTestcaseBowling} */
    this.testcase = null;

    /** @type {InputsDualstick} */
    this.inputs = null;

    /** @type {CameraTopdown} */
    this.camera_controls = null;

    /** @type {THREE.Object3D} */
    this.playscene = null;

    /** @type {Physics} */
    this.physics = null;

    this.attack = false;
    this.move = false;
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.testcase.step(dt);
    this.animate(dt);
    this.camera_controls.step(dt);
    this.physics.step(dt);
  }

  animate(dt) {
    const update_pointer = (mesh, visible) => {
      const pointer_size = this.testcase.pawn && visible ? 1 : 0;
      mesh.scale.setScalar(dlerp(mesh.scale.x, pointer_size, 1, dt * 1e-3));
      mesh.rotateY(3e-4 * dt);
    };
    update_pointer(this.pointer_mesh_a, this.move);
    update_pointer(this.pointer_mesh_b, this.attack);
  }

  run() {
    App.instance.start(this.container.querySelector("render"));

    const render = App.instance.render;
    const scene = render.scene;

    //render.pixelate(true);

    this.environment = new Environment1();
    this.environment.run({ floor: false });

    this.physics = new Physics().run({ fixed_step: false });
    this.physics.create_box(
      new Vector3(0, -1, 0),
      new Vector3(100, 2, 100),
      RigidBodyType.STATIC,
    );
    this.inputs = new InputsDualstick(
      this.container,
      this.container,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();

    this.camera_controls = new CameraTopdown();
    this.testcase = new AaTestcaseBowling();
    this.testcase.run(() => {
      const obj = this.testcase.pawn._target;
      this.camera_controls.init(render.camera, obj);
      const pos = new Vector3(0, 1, 0).add(obj.position);
      const size = new Vector3(0.4, 1, 0);
      const body = this.physics.create_cylinder(
        pos,
        size,
        RigidBodyType.DYNAMIC,
        { friction: 0 },
      );
      this.physics.attach(body, this.testcase.pawn._target, {
        shift: new Vector3(0, -0.5, 0),
				allow_rotate: false
      });
      this.testcase.pawn.set_body(body);

      //this.testcase.pawn._target = this.physics.meshlist[id];
    });

    this.open_playscene("a", false);

    this.pointer_mesh_a = this.spawn_icosphere(0xb768e9);
    this.pointer_mesh_b = this.spawn_icosphere(0xb7e968);
    scene.add(this.pointer_mesh_a);
    scene.add(this.pointer_mesh_b);
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

        this.environment.lights.csm?.setupMaterial(material);
      });

      if (add_to_scene) {
        App.instance.render.scene.add(scene);
      }

      return scene;
    });
  }

  input(type, start) {
    switch (type) {
      case InputAction.action_a:
        this.move = start;
        break;
      case InputAction.action_b:
        this.attack = start;
        if (this.testcase.pawn) {
          this.testcase.pawn.allow_move = !start;
        }
        break;
    }
  }

  /**
   * @param {number} x .
   * @param {number} x .
   * @param {string} tag .
   * @param {InputAction} type .
   */
  input_analog(x, y, tag, type) {
    if (!this.testcase?.pawn) {
      return;
    }
    const p = cache.vec3.v0;
    const ap = cache.vec3.v1;
    p.set(x, -0.1, y).applyAxisAngle(
      Vec3Up,
      this.camera_controls._camera.rotation.y,
    );
    const pawnpos = this.testcase.pawn._target.position;
    ap.copy(p).negate().add(pawnpos);

    this.physics.raycast(pawnpos, ap, (s, h) => {
      ap.set(h.position.x, 0, h.position.z);
    });

    this.testcase.set_goal(ap);
    switch (type) {
      case InputAction.action_a:
        this.pointer_mesh_a.position.copy(ap);
        break;
      case InputAction.action_b:
        this.pointer_mesh_b.position.copy(ap);
        this.camera_controls.set_direction(p);
        break;
    }
  }

  open_playscene(name, lightmaps = true) {
    return new Promise((resolve, reject) => {
      const root_path = `bowling/scenes/${name}/`;
      const load = (config) => {
        this.close_playscene();

        this.add_gltf(root_path + `scene.glb`).then((scene) => {
          this.playscene = scene;
          if (config) {
            LightsA.apply_lightmaps(scene, root_path, config);
          }
          LightsA.apply_lightmaps_white(scene);
          scene.traverse((o) => {
            /** @type {THREE.Mesh} */
            const m = /** @type {any} */ (o);
            if (!m.isMesh) {
              return;
            }
            if (m.name.includes("phys")) {
              const center = m.geometry.boundingBox.getCenter(cache.vec3.v0);
              center.set(center.x, center.z, center.y);
              center.add(m.position);
              const size = m.geometry.boundingBox.getSize(cache.vec3.v1);
              size.applyAxisAngle(Vec3Forward, Math.PI * 0.5);
              //size.set(size.x, size.z, size.y);
              const type = m.name.includes("dynamic")
                ? RigidBodyType.DYNAMIC
                : RigidBodyType.STATIC;
              const box = this.physics.create_box(center, size, type);
            }
          });

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
  /**
   * @returns {THREE.Mesh}
   */
  spawn_icosphere(color) {
    const geometry = new THREE.IcosahedronGeometry(0.1);
    const material = this.create_material(color);
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
  }

  create_material(color) {
    const material = new THREE.MeshPhongMaterial({
      color: color ?? 0xb768e9,
      emissive: 0x4f7e8b,
      shininess: 10,
      specular: 0xffffff,
    });

    return material;
  }

  /**
   * Creates box with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @returns {string} body id
   */
  create_physics_box(pos, size, type, color = 0xffffff) {
    const body = this.physics.create_box(pos, size, type);
    let geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    let material = this.create_material(color);
    this.environment.lights.csm?.setupMaterial(material);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this.physics.attach(body, mesh);

    return body.id;
  }

  /**
   * Creates cylinder with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {number} color .
   * @param {object} [opts] .
   * @param {number} [opts.friction=1] .
   * @returns {string} body id
   */
  create_physics_cylinder(pos, size, type, color = 0xffffff, opts) {
    const body = this.physics.create_cylinder(pos, size, type, opts);
    let geometry = new THREE.CylinderGeometry(size.x, size.x, size.y);
    let material = this.create_material(color);
    this.environment.lights.csm?.setupMaterial(material);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this.physics.attach(body, mesh);

    return body.id;
  }

  stop() {
    this.testcase.stop();
    this.environment.stop();
    this.inputs.stop();
    this.physics.stop();
    this.environment = null;
    this.testcase = null;
    this.inputs = null;
    this.physics = null;
    this.close_playscene();

    App.instance.render.pixelate(false);
    App.instance.pause();
  }
}

export default AaPageTestcaseBowling;
