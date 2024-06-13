 /** @namespace Core */

import { Vector3, } from "three";

export const Vec3Up = new Vector3(0, 0, 1);
export const Vec3Forward = new Vector3(0, 1, 0);
export const Vec3Right = new Vector3(1, 0, 0);
export const v3cache = {
	v_0: new Vector3()
}

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
