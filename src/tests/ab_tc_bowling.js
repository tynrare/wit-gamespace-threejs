/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import PawnDrawA from "../pawn/d240710_pawn.js";
import LightsA from "../lights_a.js";
import { dlerp, Vec3Right, Vec3Up, cache } from "../math.js";
import { Physics, RigidBodyType } from "../physics.js";
import Environment1 from "./environment_1.js";

/**
 * @class AaTestcaseBowling
 * @memberof Pages/Tests
 */
class AaTestcaseBowling {
  constructor() {
    /** @type {PawnDrawA} */
    this.pawn = null;

    /** @type {Physics} */
    this.physics = null;

    /** @type {oimo.dynamics.rigidbody.RigidBody} */
    this.pawn_body = null;

    /** @type {THREE.Mesh} */
    this.pawn_dbg_mesh = null;

    /** @type {THREE.Object3D} */
    this.playscene = null;

    /** @type {Environment1} */
    this.environment = null;


    this.cache = {
      vec3_0: new Vector3(),
    };
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.physics.step(dt);
    this.pawn_body.setRotationFactor(this.physics.cache.vec3_0.init(0, 0, 0));
    if (this.pawn) {
      this.pawn._target.position.copy(this.pawn_dbg_mesh.position);
      this.pawn._target.position.y -= 0.5;
      this.pawn.step(dt);

      const action_hit =
        this.pawn.animator.animation_machine.nodes["hit"].action;
      if (
        this.spawn_projectile_requested &&
        action_hit.enabled &&
        action_hit.time > 0.5
      ) {
        this._spawn_projectile();
        this.spawn_projectile_requested = false;
      }
    }
  }

  run(onload) {
    this.environment = new Environment1();
    this.environment.run({ floor: false });

    this._load_pawn().then(() => {
      this.pawn = new PawnDrawA();
      this.pawn.init(this.character_gltf, this.character_scene);
      App.instance.render.scene.add(this.character_scene);

      this.pawn_dbg_mesh.visible = false;
      this.pawn.allow_move = false;

      if (onload) {
        onload();
      }
    });

    this.physics = new Physics().run({ fixed_step: false });
    this.physics.create_box(
      new Vector3(0, -1, 0),
      new Vector3(100, 2, 100),
      RigidBodyType.STATIC,
    );

    {
      const pos = new Vector3(0, 1, 0);
      const size = new Vector3(0.4, 1, 0);
      const id = this.create_physics_cylinder(
        pos,
        size,
        RigidBodyType.DYNAMIC,
        { friction: 0, density: 1, adamping: 10, ldamping: 1 },
        0x48a9b1,
      );
      const mesh = this.physics.meshlist[id];
      const body = this.physics.bodylist[id];
      this.pawn_body = body;
      this.pawn_dbg_mesh = mesh;
    }

    this.open_playscene("a");
  }

  /**
   * @param {THREE.Vector3} pos
   */
  set_goal(pos) {
    if (this.pawn) {
      this.pawn.goal.copy(pos);
    }
  }

  _spawn_projectile() {
    const radius = 0.4;
    const d = cache.vec3.v0;
    const pos = cache.vec3.v1;
    const facing_direction = d
      .copy(Vec3Right)
      .applyAxisAngle(Vec3Up, this.pawn._target.rotation.y);
    pos
      .copy(d)
      .setLength(radius * 2)
      .add(this.pawn._target.position);
    pos.y = 0.5;
    const impulse = this.physics.cache.vec3_0;
    impulse.init(d.x * 30, 0, d.z * 30);
    let color = new THREE.Color(Math.random(), Math.random(), Math.random());
    const body = this.physics.create_sphere(
      pos,
      radius,
      RigidBodyType.DYNAMIC,
      {
        density: 10,
        friction: 0.3,
        restitution: 0.7,
      },
    );
    const mesh = this.projectile_gltf.scene.clone();
    mesh.scale.multiplyScalar(radius * 2);
    mesh.position.copy(pos);
    App.instance.render.scene.add(mesh);
    this.physics.attach(body, mesh);
    body.applyLinearImpulse(impulse);
  }

  spawn_projectile() {
    this.spawn_projectile_requested = true;

    this.pawn.animator.transite("hit", true);
  }

  async _load_pawn() {
    this.character_gltf = await this.add_gltf("bowling/pawn1.glb", false);
    this.character_scene = this.character_gltf.scene;
    this.projectile_gltf = await this.add_gltf(
      "bowling/projectile1.glb",
      false,
    );
  }

  open_playscene(name, lightmaps = true) {
    return new Promise((resolve, reject) => {
      const root_path = `bowling/scenes/${name}/`;
      const load = (config) => {
        this.close_playscene();

        this.add_gltf(root_path + `scene.glb`).then((gltf) => {
          const scene = gltf.scene;
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

  add_gltf(url, add_to_scene = true) {
    const render = App.instance.render;
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
        this.environment.lights.csm?.setupMaterial(material);
        /** @type {THREE.MeshStandardMaterial} */
        const material = /** @type {any} */ (m.material);
        material.metalness = 0;
      });

      if (add_to_scene) {
        render.scene.add(scene);
      }

      return gltf;
    });
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
   * @param {number} color .
   * @returns {string} body id
   */
  create_physics_box(pos, size, type, color = 0xffffff) {
    const body = this.physics.create_box(pos, size, type);
    let geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    let material = this.create_material(color);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this.physics.attach(body, mesh);

    return body.id;
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
    const body = this.physics.create_sphere(pos, radius, type, opts);
    let geometry = opts?.icosphere
      ? new THREE.IcosahedronGeometry(radius)
      : new THREE.SphereGeometry(radius);
    let material = this.create_material(color);
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
   * @param {object?} [opts] .
   * @param {number} [opts.friction=1] .
   * @param {number} [color] .
   * @returns {string} body id
   */
  create_physics_cylinder(pos, size, type, opts, color = 0xffffff) {
    const body = this.physics.create_cylinder(pos, size, type, opts);
    let geometry = new THREE.CylinderGeometry(size.x, size.x, size.y, 6);
    let material = this.create_material(color);
    material.wireframe = true;
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this.physics.attach(body, mesh);

    return body.id;
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

export default AaTestcaseBowling;
