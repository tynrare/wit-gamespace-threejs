/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../../loader.js";
import LightsA from "../../lights_a.js";
import PageBase from "../../page_base.js";
import App from "../../app.js";
import { Vec3Up, dlerp, cache } from "../../math.js";
import AaTestcaseBowling from "./aa_tc_bowling.js";
import Environment1 from "../environment_1.js";
import { InputAction, InputsDualstick } from "../../pawn/inputs_dualstick.js";
import CameraTopdown from "../../pawn/camera_topdown.js";
import { Physics, RigidBodyType } from "../../physics.js";
import logger from "../../logger.js";

/**
 * @class AbPageTestcaseBowling
 * @memberof Pages/Tests
 */
class AbPageTestcaseBowling extends PageBase {
  constructor() {
    super();

    /** @type {Environment1} */
    this.environment = null;

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
    this.animate(dt);
    this.camera_controls.step(dt);
    this.physics.step(dt);
    this.pawn_body.setRotationFactor(this.physics.cache.vec3_0.init(0, 0, 0));
  }

  animate(dt) {
    const update_pointer = (mesh, visible) => {
      const pointer_size = visible ? 1 : 0;
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

    render.pixelate(0.25, true);

    this.environment = new Environment1();
    this.environment.run({ floor: true });

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
      this.camera_controls.init(render.camera, mesh);
      this.pawn_body = body;
      const mesh_decor = this.spawn_icosphere(0x000000);
      mesh_decor.position.set(0, 0.5, 0.5);
      mesh.add(mesh_decor);
    }

    this.pointer_mesh_a = this.spawn_icosphere(0xb768e9);
    this.pointer_mesh_b = this.spawn_icosphere(0xb7e968);
    scene.add(this.pointer_mesh_a);
    scene.add(this.pointer_mesh_b);

    this._create_boxes();
  }

  input(type, start) {
    switch (type) {
      case InputAction.action_a:
        this.move = start;
        break;
      case InputAction.action_b:
        this.attack = start;
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
    const p = cache.vec3.v1;
    const ap = cache.vec3.v2;
    const bp = cache.vec3.v3;
    p.set(-x, 0, -y).applyAxisAngle(
      Vec3Up,
      this.camera_controls._camera.rotation.y,
    );
    ap.copy(this.camera_controls._target.position);
    ap.y = 0.1;
    bp.copy(p).add(ap);

    this.physics.raycast(ap, bp, (s, h) => {
      bp.set(h.position.x, 0, h.position.z);
    });

    switch (type) {
      case InputAction.action_a:
        this.pointer_mesh_a.position.copy(bp);
        const velocity = this.physics.cache.vec3_0;
        velocity.init(p.x * 3, 0, p.z * 3);
        this.pawn_body.setLinearVelocity(velocity);
        break;
      case InputAction.action_b:
        if (this.attack) {
          this.pointer_mesh_b.position.copy(bp);
          this.camera_controls.set_direction(p);
        } else {
          p.copy(this.pointer_mesh_b.position).sub(ap).normalize();
          // stick released
          const radius = 0.5;
          bp.copy(p)
            .setLength(radius * 2)
            .add(ap);
          const impulse = this.physics.cache.vec3_0;
          impulse.init(p.x * 50, 0, p.z * 50);
          let color = new THREE.Color(
            Math.random(),
            Math.random(),
            Math.random(),
          );
          const id = this.create_physics_sphere(
            bp,
            radius,
            RigidBodyType.DYNAMIC,
            { density: 10, friction: 0.3, restitution: 0.7, icosphere: true },
            color,
          );
          const body = this.physics.bodylist[id];
          body.applyLinearImpulse(impulse);
        }

        break;
    }
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
   * @param {number} color .
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
   * @param {object?} [opts] .
   * @param {number} [opts.friction=1] .
   * @param {number} [color] .
   * @returns {string} body id
   */
  create_physics_cylinder(pos, size, type, opts, color = 0xffffff) {
    const body = this.physics.create_cylinder(pos, size, type, opts);
    let geometry = new THREE.CylinderGeometry(size.x, size.x, size.y, 6);
    let material = this.create_material(color);
    this.environment.lights.csm?.setupMaterial(material);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this.physics.attach(body, mesh);

    return body.id;
  }

  _create_boxes() {
    const BOX_SIZE = 1;
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        let i = x + (15 - y) * 16;
        let z = 0;
        let x1 = -10 + x * BOX_SIZE * 3 + Math.random() * 0.1;
        let y1 = 0.5;
        let z1 = -0 + (15 - y) * BOX_SIZE * 3 + Math.random() * 0.1;
        let color = new THREE.Color(
          Math.random(),
          Math.random(),
          Math.random(),
        );
        let w = BOX_SIZE * 1;
        let h = BOX_SIZE * 1;
        let d = BOX_SIZE * 1;
        const dynamic = Math.random() > 0.5;
        const type = dynamic ? RigidBodyType.DYNAMIC : RigidBodyType.STATIC;
        color = dynamic ? color : 0x000000;
        this.create_physics_box(
          cache.vec3.v0.set(x1, y1, z1),
          cache.vec3.v1.set(w, h, d),
          type,
          color,
        );
      }
    }
  }

  stop() {
    this.environment.stop();
    this.inputs.stop();
    this.physics.stop();
    this.environment = null;
    this.inputs = null;
    this.physics = null;

    App.instance.render.pixelate(false);
    App.instance.pause();
  }
}

export default AbPageTestcaseBowling;
