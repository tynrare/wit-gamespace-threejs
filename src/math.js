 /** @namespace Core */

import { Vector3 } from "three";

export const Vec3Up = new Vector3(0, 0, 1);
export const Vec3Forward = new Vector3(0, 1, 0);

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
