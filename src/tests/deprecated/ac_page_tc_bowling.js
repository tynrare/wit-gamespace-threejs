/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../../loader.js";
import LightsA from "../../lights_a.js";
import PageBase from "../../page_base.js";
import App from "../../app.js";
import { Vec3Up, dlerp, cache } from "../../math.js";
import AcTestcaseBowling from "./ac_tc_bowling.js";
import { InputAction, InputsDualstick } from "../../pawn/inputs_dualstick.js";
import CameraTopdown from "../../pawn/camera_topdown.js";
import { Physics, RigidBodyType } from "../../physics.js";
import logger from "../../logger.js";

/**
 * @class AcPageTestcaseBowling
 * @memberof Pages/Tests
 */
class AcPageTestcaseBowling extends PageBase {
  constructor() {
    super();

    /** @type {AcTestcaseBowling} */
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

    this.testcase = new AcTestcaseBowling();
    this.testcase.run(() => {
      this._create_boxes();
      this._create_motors();
    });

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
		if (this.testcase.stun > 0) {
			return;
		}


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

    const attack = this.attack || this.testcase.spawn_projectile_requested;
    if (!attack || tag != "movement") {
      this.testcase.set_goal(bp);
    }

    this.testcase.physics.raycast(ap, bp, (s, h) => {
      bp.set(h.position.x, 0, h.position.z);
    });

    switch (type) {
      case InputAction.action_a:
        this.pointer_mesh_a.position.copy(bp);
        const velocity = this.testcase.physics.cache.vec3_0;
        velocity.init(p.x * 2, 0, p.z * 2);
        if (attack) {
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

  _create_motors() {
    const pos = cache.vec3.v0;
    const size = cache.vec3.v1;
    pos.set(2, 0.9, -3);
    size.set(0.5, 0.5, 0.5);
    const id1 = this.testcase.create_physics_box(
      pos,
      size,
      RigidBodyType.STATIC,
      null,
      0x000000,
    );
    pos.set(3, 0.9, -3);
    size.set(2, 0.4, 0.4);
    const id2 = this.testcase.create_physics_box(
      pos,
      size,
      RigidBodyType.DYNAMIC,
      {
        density: 100,
      },
      0xffffff,
    );
    const b1 = this.testcase.physics.bodylist[id1];
    const b2 = this.testcase.physics.bodylist[id2];
    const motor = this.testcase.physics.create_joint_motor(b1, b2, null, {
      x: 5,
      y: 100,
    });
  }

  _create_boxes() {
    const BOX_SIZE = 1;
    const amount = 4;
    for (let x = 0; x < amount; x++) {
      for (let y = 0; y < amount; y++) {
        let i = x + (amount - 1 - y) * amount;
        let z = 0;
        let x1 = -10 + x * BOX_SIZE * 3 + Math.random() * 0.1;
        let y1 = 10;
        let z1 = 4 + (amount - 1 - y) * BOX_SIZE * 3 + Math.random() * 0.1;
        let w = BOX_SIZE * 1;
        let h = BOX_SIZE * 1;
        let d = BOX_SIZE * 1;
        const dynamic = Math.random() > 0.0;
        const type = dynamic ? RigidBodyType.DYNAMIC : RigidBodyType.STATIC;
        const color = dynamic ? 0xffffff : 0x000000;
        const id = this.testcase.create_physics_box(
          cache.vec3.v0.set(x1, y1, z1),
          cache.vec3.v1.set(w, h, d),
          type,
          color,
        );
        const body = this.testcase.physics.bodylist[id];
        const vel = this.testcase.physics.cache.vec3_0;
        vel.init(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        );
        body.setAngularVelocity(vel);
      }
    }
  }

  stop() {
    this.testcase.stop();
    this.inputs.stop();
    this.inputs = null;
    this.testcase = null;

    App.instance.pause();
  }
}

export default AcPageTestcaseBowling;
