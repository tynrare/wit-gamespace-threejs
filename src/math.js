 /** @namespace Core */

import { Vector3, Color } from "three";

export const Vec3Up = new Vector3(0, 0, 1);
export const Vec3Forward = new Vector3(0, 1, 0);
export const Vec3Right = new Vector3(1, 0, 0);

/**
 * @param {import("three").Vector3} v1 changed inplace
 * @param {import("three").Vector3Like} v2 .
 * @param {number} decay factor (0-1)
 * @param {number} dt delta time
 */
export function dlerp_vec3(v1, v2, decay, dt) {
	v1.x = dlerp(v1.x, v2.x, decay, dt);
	v1.y = dlerp(v1.y, v2.y, decay, dt);
	v1.z = dlerp(v1.z, v2.z, decay, dt);

	return v1;
}

export function angle_sub(angle1, angle2) {
  const diff = ((angle2 - angle1 + Math.PI) % (Math.PI * 2)) - Math.PI;
  return diff < -Math.PI ? diff + Math.PI * 2 : diff;
}

export function clamp(min, max, v) {
    return Math.min(max, Math.max(v, min))
}

export function lerp(a, b, t) {
	return a + t * (b - a);
}

/**
 * exponential decay lerp
 *
 * @param {number} a initial value
 * @param {number} b target value
 * @param {number} decay factor
 * @param {number} dt delta time
 */
export function dlerp(a, b, decay, dt) {
	const d = 1 + decay * 25;
	return b + (a - b) * Math.exp(-d * dt);
}

// -- hashes

// -- 3d math

/**
 * @constant
 */
export const PERFECT_NUMBER = Math.sin(Math.PI / Math.pow(2, 2)); // 0.707
/**
 * PERFECT_NUMBER^2 * 0.1
 *
 * @constant
 */
export const DEFAULT_GEOM_THRESHOLD = Math.pow(PERFECT_NUMBER, 2) * 0.1; // 0.049

export const cache = {
	vec3: {
		v0: new Vector3(),
		v1: new Vector3(),
		v2: new Vector3(),
		v3: new Vector3(),
		v4: new Vector3(),
		v5: new Vector3(),
		v6: new Vector3(),
		v7: new Vector3(),
		v8: new Vector3(),
		v9: new Vector3()
	},
	color0: new Color()
};

// buffer vectors
const vec0 = cache.vec3.v0;
const vec1 = cache.vec3.v1;
const vec2 = cache.vec3.v2;
const vec3 = cache.vec3.v3;
const vec4 = cache.vec3.v4;
const vecR = cache.vec3.v5; // functions return this vector

/**
 * @param {Vector3} a .
 * @param {Vector3} b .
 * @param {Vector3} c .
 * @returns {Vector3} normalized triangle face vec
 */
export function triangle_normal(a, b, c) {
	const v0 = vec0.copy(a).sub(b); //                V0 = P0-P1
	const v1 = vecR.copy(c).sub(b); //                V1 = P2-P1
	const normal = v1.cross(v0).normalize(); // N = cross (V1, V0)

	return normal;
}


/**
 * Converts world coords into pos on plane
 *
 * @param {Vector3} point point to work with
 * @param {Vector3} origin plane origin
 * @param {Vector3} normal plane normal
 * @returns {Vector3} point on plane
 */
export function project_on_plane(point, origin, normal) {
	const local = vec3.copy(point).sub(origin);
	const forward = vec1.copy(normal).cross(local).normalize();
	const right = vec2.copy(normal).cross(forward).normalize();

	const x = local.dot(right);
	const z = local.dot(forward);

	return vecR.copy(origin).add(right.multiplyScalar(x)).add(forward.multiplyScalar(z));
}

/**
 * Closest point on segment
 *
 * @param {Vector3} a line start
 * @param {Vector3} b line end
 * @param {Vector3} point point to project
 * @returns {Vector3} closest to line point
 */
export function project_on_line(a, b, point) {
	const local = vec0.copy(point).sub(a);
	const line = vecR.copy(b).sub(a).normalize();
	const dist = local.dot(line);

	return line.multiplyScalar(dist).add(a);
}

/**
 * Closest point on segment
 *
 * @param {Vector3} a line start
 * @param {Vector3} b line end
 * @param {Vector3} point point to project
 * @returns {Vector3} closest to line point
 */
export function project_on_line_clamp(a, b, point) {
	const local = vec0.copy(point).sub(a);
	const line = vec1.copy(b).sub(a);
	const nline = vecR.copy(line).normalize();
	const dist = clamp(-DEFAULT_GEOM_THRESHOLD, line.length() + DEFAULT_GEOM_THRESHOLD, local.dot(nline));

	return nline.multiplyScalar(dist).add(a);
}

/**
 * @param {Vector3} origin plane origin
 * @param {Vector3} normal plane normal direction
 * @param {Vector3} point point to check
 * @returns {boolean} .
 */
export function is_point_in_plane_positive(origin, normal, point) {
	const po = vec0.copy(point).sub(origin);

	return po.dot(normal) >= 0;
}

/**
 * @param {Vector3} origin plane origin
 * @param {Vector3} normal plane normal direction
 * @param {Vector3} point point to check
 * @returns {boolean} .
 */
export function is_point_in_plane_positive_thrsholded(origin, normal, point) {
	const threshold = vec1.copy(normal).multiplyScalar(DEFAULT_GEOM_THRESHOLD);
	const o = vec2.copy(origin).sub(threshold);

	return is_point_in_plane_positive(o, normal, point);
}

/**
 * Closest point on segment. Thresholds a-b segment for validation
 *
 * @param {Vector3} a line start
 * @param {Vector3} b line end
 * @param {Vector3} point point to project
 * @returns {boolean} .
 */
export function is_point_on_line(a, b, point) {
	const n = vec1.copy(b).sub(a).normalize();

	return is_point_in_plane_positive(a, n, point) && is_point_in_plane_positive(b, n.negate(), point);
}

/**
 * Closest point on segment. Thresholds a-b segment for validation
 *
 * @param {Vector3} a line start
 * @param {Vector3} b line end
 * @param {Vector3} point point to project
 * @returns {boolean} .
 */
export function is_point_on_line_thresholded(a, b, point) {
	const n = vec3.copy(b).sub(a).normalize();

	return (
		is_point_in_plane_positive_thrsholded(a, n, point) &&
		is_point_in_plane_positive_thrsholded(b, n.negate(), point)
	);
}

/**
 * Project one segment on another. It isn't "crossing"
 * Uses vec0-3
 *
 * @param {Vector3} a1 line 1 start
 * @param {Vector3} b1 line 1 end
 * @param {Vector3} a2 line 2 start
 * @param {Vector3} b2 line 2 end
 * @returns {Vector3?} a1->b1 projection on a2->b2. Null if projection out of a2->b2 segment
 */
export function project_line_on_line(a1, b1, a2, b2) {
	const y = vec1.copy(project_on_line(a1, b1, a2));
	const z = vec2.copy(project_on_line(a1, b1, b2));

	const yDist = a2.distanceTo(y);
	const zDist = b2.distanceTo(z);

	const proportion = yDist / (yDist + zDist);
	const yz = z.sub(y).multiplyScalar(proportion || 0);

	const p = vecR.copy(y).add(yz);

	if (!is_point_on_line_thresholded(a2, b2, p)) {
		return null;
	}

	return p;
}

/**
 * Does it work? Not sure.
 *
 * @param {Vector3} a
 * @param {Vector3} b
 * @param {Vector3} c
 * @param {Vector3} point
 * @returns {Vector3} .
*/
export function get_trilinear_position(a, b, c, point) {
	const la = a.distanceTo(b);
	const lb = b.distanceTo(c);
	const lc = c.distanceTo(a);

	const d1 = vec0.copy(point).sub(a).cross(vec1.copy(point).sub(b)).length() / la;
	const d2 = vec0.copy(point).sub(b).cross(vec1.copy(point).sub(c)).length() / lb;
	const d3 = vec0.copy(point).sub(c).cross(vec1.copy(point).sub(a)).length() / la;

	return vecR.set(d1, d2, d3);
}

 /**
 * @param {Vector3} a
 * @param {Vector3} b
 * @param {Vector3} c
 * @param {Vector3} point
 * @returns {Vector3} .
*/
export function get_barycentric_coordinates(a, b, c, point) {
	const vba = vec0.copy(b).sub(a);
	const vca = vec1.copy(c).sub(a);
	const vpa = vec2.copy(point).sub(a);

	const d00 = vba.dot(vba);
	const d01 = vba.dot(vca);
	const d11 = vca.dot(vca);
	const d20 = vpa.dot(vba);
	const d21 = vpa.dot(vca);

	const denom = d00 * d11 - d01 * d01;

	const v = (d11 * d20 - d01 * d21) / denom;
	const w = (d00 * d21 - d01 * d20) / denom;
	const u = 1.0 - v - w;

	return vecR.set(u, v, w);
}

 /**
 * @param {Vector3} a
 * @param {Vector3} b
 * @param {Vector3} c
 * @param {Vector3} bc_point
 * @returns {Vector3} .
*/
export function barycentric_to_cartesian(a, b, c, bc_point) {
	const fa = vec0.copy(a).multiplyScalar(bc_point.x);
	const fb = vec1.copy(b).multiplyScalar(bc_point.y);
	const fc = vec2.copy(c).multiplyScalar(bc_point.z);

	return vecR.copy(fa).add(fb).add(fc);
}
