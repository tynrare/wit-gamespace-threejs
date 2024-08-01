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
import { InputsMap, InputAction } from "../pawn/inputs_map.js";

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

    this.elapsed = 0;
  }
  run(mapname, origin, onload) {
    const render = App.instance.render;
    const scene = render.scene;

    this.pawn_model_actual = render.utils.spawn_box0(0xfa2123, 0.2);
    this.pawn_model_actual.material.wireframe = true;
    this.pawn_model_visual = render.utils.spawn_box0(null, 0.2);
    scene.add(this.pawn_model_actual);
    scene.add(this.pawn_model_visual);

    this.navmesh = new Navmesh();
    const mesh = Loader.instance.get_gltf(mapname).then((gltf) => {
      const s = gltf.scene.clone();
      this.scene = s;
      scene.add(s);
      s.position.copy(origin);
      const m = s.children[0];
      m.material.wireframe = true;
      this.navmesh.build(m);

			const p = cache.vec3.v0.copy(origin);
      this.pawn_npoint = this.navmesh.register(p);

			if (onload) {
				onload();
			}
    });

    return this;
  }
  step(dt) {
    this.elapsed += dt;

    if (this.pawn_npoint) {
      this.pawn_model_actual.position.copy(this.pawn_npoint.worldpos);

      // set face rotation
      const wdir = cache.vec3.v0.set(0, 1, 0);
      wdir.applyQuaternion(this.pawn_model_actual.quaternion);
      const angle = wdir.angleTo(this.pawn_npoint.face.normal);
      wdir.cross(this.pawn_npoint.face.normal).normalize();
      this.pawn_model_actual.rotateOnWorldAxis(wdir, angle);

      // move forwards
      wdir.set(0, 0, 1);
      wdir.applyQuaternion(this.pawn_model_actual.quaternion);
      wdir.multiplyScalar(0.01);
      wdir.add(this.pawn_model_actual.position);
      this.navmesh.move(this.pawn_npoint.id, wdir);

      wdir.set(0, 1, 0);
      wdir.applyQuaternion(this.pawn_model_actual.quaternion);
      this.pawn_model_actual.rotateOnWorldAxis(
        wdir,
        Math.sin(this.elapsed * 1e-3) * 0.1,
				//0.01
      );

      /*
			const x = Math.sin(this.elapsed * 1e-3);
			const z = Math.cos(this.elapsed * 1e-3);
			const r = 0.9;
			const p = cache.vec3.v0.set(x, 0, z).multiplyScalar(r);
			this.navmesh.move(this.pawn_npoint.id, p);
			*/
    }

    this.pawn_model_visual.position.copy(this.pawn_model_actual.position);
    this.pawn_model_visual.quaternion.slerp(
      this.pawn_model_actual.quaternion,
      0.2
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

    /** @type {MapControls} */
    this.controls = null;

    /** @type {InputsMap} */
    this.inputs = null;

    /** @type {Array<TestNavmesh>} */
    this.tests = [];
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    this.controls.update();

    for (const i in this.tests) {
      this.tests[i].step(dt);
    }
  }

  run() {
    App.instance.start(this.container.querySelector("render"));

    const render = App.instance.render;
    const scene = render.scene;

    scene.background = new THREE.Color(0x66c0dc);
    this.lights = new LightsA().run(App.instance.render);
    this.lights.lights.directional.intensity = 1;

    // floor
    {
      const plane = createFloorPlane();
      scene.add(plane);
      this.plane = plane;
    }

    this.inputs = new InputsMap(
      this.container,
      render,
      this.input.bind(this),
      this.input_analog.bind(this),
    );

    // camera controls
    const controls = new MapControls(render.camera, render.renderer.domElement);
    controls.enableDamping = true;
    this.controls = controls;

    this.tests.push(
      new TestNavmesh().run(
        "test/test_navmesh0.glb",
        new THREE.Vector3(0, 1, 0),
      ),
    );
    this.tests.push(
      new TestNavmesh().run(
        "test/test_navmesh1.glb",
        new THREE.Vector3(2.1, 1, 0),
      ),
    );
    this.tests.push(
      new TestNavmesh().run(
        "test/test_navmesh2.glb",
        new THREE.Vector3(4.2, 1, 0),
      ),
    );
    this.tests.push(
      new TestNavmesh().run(
        "test/test_navmesh4.glb",
        new THREE.Vector3(6.3, 1, 0),
      ),
    );
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
  input_analog(x, z, action) {}

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
