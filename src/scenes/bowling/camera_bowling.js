import * as THREE from "three";
import { Box2, Color, Vector3 } from "three";
import CameraTopdown from "../../pawn/camera_topdown.js";
import App from "../../app.js";
import { cache, intersect_line_line_2d } from "../../math.js";

class CameraBowlingA {
  constructor() {
    /** @type {CameraTopdown} */
    this.controls = null;
    this.camerapos = new Vector3();

    this.cvec2_0 = new THREE.Vector2();

		/** @type {Box2} */
    this.bounds = null;
  }

  /**
   * @param {Vector2} min .
   * @param {Vector2} max .
   */
  set_bounds(min, max) {
		this.bounds = new Box2(min, max);
  }

  calc_bounds() {
    const shift = cache.vec2.v1.setScalar(0);
    if (!this.bounds) {
      return shift;
    }
    const render = App.instance.render;
		const raycaster = cache.raycaster;
    const point = cache.vec2.v0;
		const pos2d = cache.vec2.v2;
		const pos = cache.vec3.v0;
		const calc = (camx, camy) => {
			point.set(camx, camy); //left up
			raycaster.setFromCamera(point, render.camera);
			raycaster.ray.intersectPlane(cache.planeup, pos);
			pos2d.set(pos.x, pos.z);
			this.bounds.clampPoint(pos2d, point);
			point.sub(pos2d);
			shift.add(point);
		}
		calc(-1, 1);
		calc(1, 1); //right up
		calc(-1, -1); //left b
		calc(1, -1); //right b

    return shift;
  }

  step(dt) {
    const render = App.instance.render;
    // camera
    if (this.controls) {
			const dist = render.camera.position.distanceTo(this.controls._target.position);
      const bounds_shift = this.calc_bounds();
			const pshift = cache.vec3.v0.set(bounds_shift.x, 0, bounds_shift.y);
      this.controls.shift.lerp(pshift, 0.1);
      this.controls.step(dt);
    } else {
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
    this.controls.init(App.instance.render.camera, follow);
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
