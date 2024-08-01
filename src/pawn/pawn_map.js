import * as THREE from "three";
import { cache } from "../math.js";

class PawnMap {
  constructor() {
    this.path_a = new THREE.Vector3();
    this.path_timestamp = 0;
    this.path_b = new THREE.Vector3();
    this.speed = 1;

    this.elapsed = 0;
  }

  step(dt) {
    this.elapsed += dt;
  }

  get_pos() {
    const path_time = (Date.now() - this.path_timestamp) * 1e-3;
    const path = cache.vec3.v0.copy(this.path_b).sub(this.path_a);
    const path_len = path.length();
    path.normalize().multiplyScalar(Math.min(path_len, path_time * this.speed));

		return path.add(this.path_a);
  }

  set_goal(pos) {
		const pb = cache.vec3.v1.copy(pos);
		const pa = cache.vec3.v2.copy(this.get_pos());
    this.path_a = pa;
    this.path_b.copy(pb);
    this.path_timestamp = Date.now();
  }
}

export default PawnMap;
