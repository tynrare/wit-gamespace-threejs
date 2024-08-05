import * as THREE from "three";
import { cache } from "../math.js";
import { Entity } from "../entity.js";

class PawnMap {
  /**
   * @param {Entity} entity .
   */
  constructor(entity) {
    this.entity = entity;

    this.elapsed = 0;

    this.path_timestamp = 0;
    this.path_len = 0;
    this.path_direction = new THREE.Vector3();
    this.speed = 1;
  }

  init() {
		this.teleport(cache.vec3.v0.set(0, 0, 0));
	}

  get_path_a(pos = cache.vec3.v0) {
    pos.x = this.entity.positions[0];
    pos.y = this.entity.positions[1];
    pos.z = this.entity.positions[2];

		return pos;
  }

  set_path_a(pos) {
    this.entity.positions[0] = pos.x;
    this.entity.positions[1] = pos.y;
    this.entity.positions[2] = pos.z;
  }

  get_path_b(pos = cache.vec3.v0) {
    pos.x = this.entity.positions[3];
    pos.y = this.entity.positions[4];
    pos.z = this.entity.positions[5];

		return pos;
  }

  set_path_b(pos) {
    this.entity.positions[3] = pos.x;
    this.entity.positions[4] = pos.y;
    this.entity.positions[5] = pos.z;
  }

	/**
	 * cache v0 v1 in use
	 */
  get_pos(v = cache.vec3.v0) {
    const path_time = (Date.now() - this.path_timestamp) * 1e-3;
    const path_len = this.path_len;
    const path = v.copy(this.path_direction);
    path.multiplyScalar(Math.min(path_len, path_time * this.speed));

    return path.add(this.get_path_a(cache.vec3.v1));
  }

  step(dt) {
    this.elapsed += dt;

		// entity positions was updated on background
		if (this.entity.updated) {
			this.entity.updated = false;
			this.set_goal(this.get_path_b(cache.vec3.v0));
		}
  }

  get moving() {
    const path_time = (Date.now() - this.path_timestamp) * 1e-3;
    const path_len = this.path_len;

    return path_len > path_time * this.speed;
  }

	/**
	 * cache v0 v1 v2 v3 in use
	 */
  set_goal(pos) {
    const pb = cache.vec3.v2.copy(pos);
    const pa = this.get_pos(cache.vec3.v3);
    this.set_path_a(pa);
    this.set_path_b(pb);
    this.path_timestamp = Date.now();

    const path = this.get_path_b(cache.vec3.v0).sub(
      this.get_path_a(cache.vec3.v1),
    );
    this.path_len = path.length();
    this.path_direction.copy(path.normalize());
  }

  teleport(pos) {
    this.set_path_a(pos);
    this.set_path_b(pos);
  }
}

export default PawnMap;
