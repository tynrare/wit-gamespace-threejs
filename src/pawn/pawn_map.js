import * as THREE from "three";
import { cache } from "../math.js";

class PawnMap {
  constructor() {
    this.path_a = new THREE.Vector3(0, 0, 1e-5);
    this.path_timestamp = 0;
    this.path_b = new THREE.Vector3();
		this.path_len = 0;
		this.path_direction = new THREE.Vector3();
    this.speed = 1;

    this.elapsed = 0;
  }

  step(dt) {
    this.elapsed += dt;
  }

  get_pos() {
    const path_time = (Date.now() - this.path_timestamp) * 1e-3;
    const path_len = this.path_len;
    const path = cache.vec3.v0.copy(this.path_direction);
    path.multiplyScalar(Math.min(path_len, path_time * this.speed));

		return path.add(this.path_a);
  }

	get moving() {
    const path_time = (Date.now() - this.path_timestamp) * 1e-3;
    const path_len = this.path_len;

		return path_len > path_time * this.speed;
	}

  set_goal(pos) {
		const pb = cache.vec3.v1.copy(pos);
		const pa = cache.vec3.v2.copy(this.get_pos());
    this.path_a.copy(pa);
    this.path_b.copy(pb);
    this.path_timestamp = Date.now();

    const path = cache.vec3.v0.copy(this.path_b).sub(this.path_a);
    this.path_len = path.length();
		this.path_direction.copy(path.normalize());
  }
}

export default PawnMap;
