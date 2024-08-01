/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { createFloorPlane } from "./utils.js";
import { cache } from "../math.js";
import { Navmesh, NavmeshPoint } from "../navmesh.js";
import { InputsDualstick, InputAction } from "../pawn/inputs_dualstick.js";
import CameraThirdPerson from "../pawn/camera_third_person_b.js";
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

class TestNavmesh {
  constructor() {
    /** @type {NavmeshPoint} */
    this.pawn_npoint = null;

    /** @type {THREE.Mesh} */
    this.pawn_model_actual = null;

    /** @type {THREE.Mesh} */
    this.pawn_model_visual = null;

    /** @type {Navmesh} */
    this.navmesh = null;

    /** @type {THREE.Object3D} */
    this.scene = null;

    this.movedir = new THREE.Vector3();

    this.elapsed = 0;
  }

  run(mapname, origin, onload) {
    const render = App.instance.render;
    const scene = render.scene;

    this.pawn_model_actual = render.utils.spawn_box0(0xfa2123, 0.2);
    this.pawn_model_actual.material.wireframe = true;
    this.pawn_model_actual.visible = false;
    this.pawn_model_visual = render.utils.spawn_box0(null, 0.4);

    this.navmesh = new Navmesh();
    const mesh = Loader.instance.get_gltf(mapname).then((gltf) => {
      const s = gltf.scene.clone();
      this.scene = s;
      scene.add(s);
      s.position.copy(origin);
      const m = s.children[0];
      //m.material.wireframe = true;
      this.navmesh.build(m);

      const p = cache.vec3.v0.copy(origin);
      p.y += 2;
      this.pawn_npoint = this.navmesh.register(p);

      s.add(this.pawn_model_actual);
      s.add(this.pawn_model_visual);

      if (onload) {
        onload();
      }
    });

    return this;
  }
  step(dt) {
    this.elapsed += dt;

    if (this.pawn_npoint) {
      const wdir = cache.vec3.v0;

      // move by movedir
      wdir.set(0, 0, this.movedir.z + Math.abs(this.movedir.y));
      wdir.applyQuaternion(this.pawn_model_actual.quaternion);
      wdir.multiplyScalar(4 * dt * 1e-3);
      wdir.add(this.pawn_model_actual.position);
      this.navmesh.move(this.pawn_npoint.id, wdir);

      // rotate by movedir
      wdir.set(0, 1, 0);
      wdir.applyQuaternion(this.pawn_model_actual.quaternion);
      this.pawn_model_actual.rotateOnWorldAxis(wdir, this.movedir.y * 0.03);

      // set position
      this.pawn_model_actual.position.copy(this.pawn_npoint.worldpos);

      // set face rotation
      wdir.set(0, 1, 0);
      wdir.applyQuaternion(this.pawn_model_actual.quaternion);
      const angle = wdir.angleTo(this.pawn_npoint.face.normal);
      wdir.cross(this.pawn_npoint.face.normal).normalize();
      this.pawn_model_actual.rotateOnWorldAxis(wdir, angle);
    }

    // apply
    this.pawn_model_visual.position.copy(this.pawn_model_actual.position);
    this.pawn_model_visual.quaternion.slerp(
      this.pawn_model_actual.quaternion,
      0.07,
    );
  }

  stop() {
    this.navmesh.dispose();
    this.pawn_model_actual.removeFromParent();
    this.pawn_model_visual.removeFromParent();
    this.scene?.removeFromParent();

    this.navmesh = null;
    this.pawn_model_actual = null;
    this.pawn_model_visual = null;
    this.scene = null;
  }
}

/**
 * @class PageTestcase5Navmesh
 * @memberof Pages/Tests
 */
class PageTestcase5Navmesh extends PageBase {
  constructor() {
    super();

    /** @type {LightsA} */
    this.lights = null;

    /** @type {CameraThirdPerson} */
    this.controls = null;

    /** @type {InputsMap} */
    this.inputs = null;

    /** @type {Array<TestNavmesh>} */
    this.tests = [];

    this.pawn = null;
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    this.controls.step(dt);

    for (const i in this.tests) {
      this.tests[i].step(dt);
    }
  }

  run() {
    App.instance.start(this.container.querySelector("render"));

    const render = App.instance.render;
    const scene = render.scene;

    scene.background = new THREE.Color(0x66c0dc);

    new EXRLoader().load(
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/1k/kloppenheim_07_1k.exr",
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
				scene.environmentIntensity = 0.8;
				this.lights.lights.directional.intensity = 0.5;
				this.lights.lights.hemisphere.intensity = 0.4;
      },
    );
    this.lights = new LightsA().run(App.instance.render);
    this.lights.lights.directional.intensity = 1;
    this.lights.lights.hemisphere.intensity = 1;

    // floor
    {
      /*
      const plane = createFloorPlane();
      scene.add(plane);
      this.plane = plane;
			*/
    }

    this.inputs = new InputsDualstick(
      this.container,
      this.container,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();

    // camera controls
    const controls = new CameraThirdPerson();
    controls.set_camera(render.camera);
    this.controls = controls;

    const t = new TestNavmesh().run(
      "test/test_navmesh3.glb",
      new THREE.Vector3(0, 0, 0),
      () => {
        this.pawn = t.pawn_model_actual;
        controls.set_target(t.pawn_model_visual);
      },
    );
    this.tests.push(t);
  }

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input(action, start) {}

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input_analog(x, y, tag, action) {
    if (tag != "movement") {
      return;
    }

    this.tests[0].movedir.set(0, x, y);
  }

  stop() {
    App.instance.pause();
    this.lights.stop();
    this.lights = null;
    this.controls = null;
    this.inputs.stop();
    this.inputs = null;
    while (this.tests.length) {
      const v = this.tests.pop();
      v.stop();
    }
  }
}

export default PageTestcase5Navmesh;
