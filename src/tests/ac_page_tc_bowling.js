/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../loader.js";
import LightsA from "../lights_a.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import { Vec3Up, dlerp, cache } from "../math.js";
import AbTestcaseBowling from "./ab_tc_bowling.js";
import { InputAction, InputsDualstick } from "../pawn/inputs_dualstick.js";
import CameraTopdown from "../pawn/camera_topdown.js";
import { Physics, RigidBodyType } from "../physics.js";
import logger from "../logger.js";

/**
 * @class AbPageTestcaseBowling
 * @memberof Pages/Tests
 */
class AbPageTestcaseBowling extends PageBase {
  constructor() {
    super();

    /** @type {AbTestcaseBowling} */
    this.testcase = null;

    /** @type {InputsDualstick} */
    this.inputs = null;

    /** @type {CameraTopdown} */
    this.camera_controls = null;

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

    this.inputs = new InputsDualstick(
      this.container,
      this.container,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();

    this.testcase = new AbTestcaseBowling();
    this.testcase.run(() => {});

    this.camera_controls = new CameraTopdown();
    this.camera_controls.init(render.camera, this.testcase.pawn_dbg_mesh);

    this.pointer_mesh_a = this.spawn_icosphere(0xb768e9);
    this.pointer_mesh_b = this.spawn_icosphere(0xb7e968);
    scene.add(this.pointer_mesh_a);
    scene.add(this.pointer_mesh_b);
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

    this.testcase.set_goal(bp);

    this.testcase.physics.raycast(ap, bp, (s, h) => {
      bp.set(h.position.x, 0, h.position.z);
    });

    switch (type) {
      case InputAction.action_a:
        this.pointer_mesh_a.position.copy(bp);
        const velocity = this.testcase.physics.cache.vec3_0;
        velocity.init(p.x * 2, 0, p.z * 2);
        if (this.attack) {
          velocity.init(0, 0, 0);
        }
        this.testcase.pawn_body.setLinearVelocity(velocity);
        break;
      case InputAction.action_b:
        if (this.attack) {
          this.pointer_mesh_b.position.copy(bp);
          this.camera_controls.set_direction(p);
        } else {
          p.copy(this.pointer_mesh_b.position).sub(ap).normalize();
          // stick released
          this.testcase.spawn_projectile(p);
        }

        break;
    }
  }

  /**
   * @returns {THREE.Mesh}
   */
  spawn_icosphere(color) {
    const geometry = new THREE.IcosahedronGeometry(0.1);
    const material = this.testcase.create_material(color);
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
  }

  stop() {
    this.testcase.stop();
    this.inputs.stop();
    this.inputs = null;
    this.testcase = null;

    App.instance.pause();
  }
}

export default AbPageTestcaseBowling;
