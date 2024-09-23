import * as THREE from "three";
import { Color, Vector3 } from "three";
import CameraTopdown from "../../pawn/camera_topdown.js";
import App from "../../app.js";
import { cache } from "../../math.js";

class CameraBowlingA {
  constructor() {
    /** @type {CameraTopdown} */
    this.controls = null;
    this.camerapos = new Vector3();
  }

  step(dt) {
    // camera
    if (this.controls) {
      this.controls.step(dt);
    } else {
      const render = App.instance.render;
      render.camera.position.lerp(this.camerapos, 1 - Math.pow(0.2, dt * 1e-3));
      const camera_target = cache.vec3.v0;
      camera_target.set(0, 1, 0);
      render.camera.lookAt(camera_target);
    }
  }

	/**
	 * @param {THREE.Object3D} follow .
	 */
	playstart(follow) {
    this.controls = new CameraTopdown();
    this.controls.init(
      App.instance.render.camera,
			follow
    );
	}

	playstop() {
    this.controls?.dispose();
    this.controls = null;
	}

	run() {
    const render = App.instance.render;
    this.camerapos.set(9, 7, 0);
    // this.camerapos.set(0, 45, 0);
    render.camera.position.copy(this.camerapos);
		
		return this;
	}
}

export default CameraBowlingA;
