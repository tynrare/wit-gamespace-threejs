/** @namespace Pages/Tests */

import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";

import App from "../app.js";
import { oimo } from "../lib/OimoPhysics.js";
import LightsA from "../lights_a.js";
import Loader from "../loader.js";
import PageBase from "../page_base.js";

import { createFloorPlane } from "./utils.js";

/**
 * @class PageTestcase1
 * @memberof Pages/Tests
 */
class PageTestcase1 extends PageBase {
  constructor() {
    super();

    /** @type {LightsA} */
    this.lights = null;

    /** @type {MapControls} */
    this.controls = null;

    /** @type {oimo.dynamics.World} */
    this.world = null;

    /** @type {Array<THREE.Mesh>} */
    this.meshes = [];
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.controls.update();
    this.world.step(1 / 60);

    (function updateObject3D(mesh) {
      if (mesh.rigid_body) {
        /** @type {oimo.dynamics.rigidbody.RigidBody} */
        const body = mesh.rigid_body;
        const position = body.getPosition();
        const quaternion = body.getOrientation();
        mesh.position.x = position.x;
        mesh.position.y = position.y;
        mesh.position.z = position.z;
        mesh.quaternion.x = quaternion.x;
        mesh.quaternion.y = quaternion.y;
        mesh.quaternion.z = quaternion.z;
        mesh.quaternion.w = quaternion.w;
      }
      if (mesh.children) {
        mesh.children.map(updateObject3D);
      }
    })(App.instance.render.scene);
  }

  run() {
    App.instance.start(this.container.querySelector("render"));

    const render = App.instance.render;
    const scene = render.scene;

    scene.background = new THREE.Color(0x66c0dc);
    this.lights = new LightsA().run(App.instance.render);
		this.lights.lights.directional.intensity = 1.5;

    // floor
    {
      const plane = createFloorPlane();
      scene.add(plane);
      this.plane = plane;
    }

    // camera controls
    const controls = new MapControls(render.camera, render.renderer.domElement);
    controls.enableDamping = true;
    this.controls = controls;

    this._init_oimo();
    this._create_boxes();
  }

  _init_oimo() {
    const broadphase = 2; // 1 brute force, 2 sweep and prune, 3 volume tree
    this.world = new oimo.dynamics.World(
      broadphase,
      new oimo.common.Vec3(0, -9.8, 0),
    );

    this.create_box(
      0,
      -1.1,
      0,
      100,
      2,
      100,
      oimo.dynamics.rigidbody.RigidBodyType.STATIC,
      new THREE.Color(0, 0, 0),
    );
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} w
   * @param {number} h
   * @param {number} d
   * @param {oimo.dynamics.rigidbody.RigidBodyType} type
   * @param {THREE.Color} color
   */
  create_box(x, y, z, w, h, d, type, color) {
    const body_config = new oimo.dynamics.rigidbody.RigidBodyConfig();
    body_config.position.init(x, y, z);
    body_config.type = type;
    const body = new oimo.dynamics.rigidbody.RigidBody(body_config);
    const shape_config = new oimo.dynamics.rigidbody.ShapeConfig();
    shape_config.geometry = new oimo.collision.geometry.BoxGeometry(
      new oimo.common.Vec3(w * 0.5, h * 0.5, d * 0.5),
    );
    shape_config.density = 1;
    shape_config.friction = 1;
    const shape = new oimo.dynamics.rigidbody.Shape(shape_config);
    body.addShape(shape);
    this.world.addRigidBody(body);
    body.setAutoSleep(false); // ? why it autosleeps in midair

    let geometry = new THREE.BoxGeometry(w, h, d);
    let material = new THREE.MeshPhongMaterial({
      color,
      emissive: 0x4f7e8b,
      shininess: 10,
      specular: 0xffffff,
    });
    let mesh = new THREE.Mesh(geometry, material);
    mesh.rigid_body = body;
    this.meshes.push(mesh);
    App.instance.render.scene.add(mesh);
  }

  _create_boxes() {
    const BOX_SIZE = 1;
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        let i = x + (15 - y) * 16;
        let z = 0;
        let x1 = -10 + x * BOX_SIZE * 1.5 + Math.random() * 0.1;
        let y1 = -0 + (15 - y) * BOX_SIZE * 1.2 + Math.random() * 0.1;
        let z1 = z * BOX_SIZE * 1 + Math.random() * 0.1;
        let color = new THREE.Color(
          Math.random(),
          Math.random(),
          Math.random(),
        );
        let w = BOX_SIZE * 1;
        let h = BOX_SIZE * 1;
        let d = BOX_SIZE * 1;
        this.create_box(
          x1,
          y1,
          z1,
          w,
          h,
          d,
          oimo.dynamics.rigidbody.RigidBodyType.DYNAMIC,
          color,
        );
      }
    }
  }

  stop() {
    this.lights.stop();
    this.lights = null;
    this.controls = null;
    this.world = null;
    this.meshes.length = 0;
    App.instance.pause();
  }
}

export default PageTestcase1;
