/** @namespace Core */
import * as THREE from "three";
import { InputAction } from "./inputs.js";
import { Vec3Up, cache } from "../math.js";
import Render from "../render.js";

/**
 * creates threejs map controls and pointer click.
 * InputAction.action_a is pointer click
 * InputAction.action_b is pointer move
 * InputAction.action_c is pointer move with pressed button
 * InputAction.action_d is pointer move delta with pressed button
 *
 *
 * @memberof Core
 * @param {HTMLElement} container .
 * @param {Render} render .
 * @param {function(InputAction, boolean): void} input .
 * @param {function(number, number, InputAction): void} input_analog (x, y, action)
 */
function InputsMap(container, render, input, input_analog) {
  this.run = () => {
    container.addEventListener("pointerdown", pointerdown);
    container.addEventListener("pointerup", pointerup);
    container.addEventListener("pointermove", pointermove);
    container.addEventListener("touchmove", pointermove, { passive: false });
    container.addEventListener("mousemove", pointermove);
  };

  this.stop = () => {
    container.removeEventListener("pointerdown", pointerdown);
    container.removeEventListener("pointerup", pointerup);
    container.removeEventListener("touchmove", pointermove);
    container.removeEventListener("mousemove", pointermove);
  };

  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const pos = cache.vec3.v0;

  function trace(sx, sy) {
    pointer.x = (sx / container.clientWidth) * 2 - 1;
    pointer.y = -(sy / container.clientHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, render.camera);
    if (raycaster.ray.intersectPlane(new THREE.Plane(Vec3Up), pos)) {
      return pos;
    }

    return null;
  }

  let pdx = 0;
  let pdy = 0;

	let wpdx = 0;
	let wpdz = 0;

  let pressed = false;

  function pointerdown(ev) {
    pressed = true;
    input(InputAction.action_a, pressed);

    pdx = ev.layerX;
    pdy = ev.layerY;

    const pos = trace(pdx, pdy);

    if (!pos) {
      return;
    }

		input_analog(pos.x, pos.z, InputAction.action_c);
		wpdx = pos.x;
		wpdz = pos.z;
		input_analog(0, 0, InputAction.action_d);
  }

  function pointerup(ev) {
    pressed = false;
    input(InputAction.action_a, pressed);

    const x = ev.layerX;
    const y = ev.layerY;
    const len = Math.sqrt(Math.pow(x - pdx, 2) + Math.pow(y - pdy, 2));

    if (len > 10) {
      return;
    }

    const pos = trace(x, y);
    if (!pos) {
      return;
    }
    input_analog(pos.x, pos.z, InputAction.action_a);
  }

  function pointermove(ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation();

    let x = ev.layerX;
    let y = ev.layerY;

    if (ev.touches?.length) {
      const touch = ev.touches[0];
      x = touch.clientX;
      y = touch.clientY;
    }
    const pos = trace(x, y);

    if (!pos) {
      return;
    }

    input_analog(pos.x, pos.z, InputAction.action_b);
    if (pressed) {
      input_analog(pos.x, pos.z, InputAction.action_c);
			input_analog(pos.x - wpdx, pos.z - wpdz, InputAction.action_d);
    }
  }
}

export { InputAction, InputsMap };
export default InputsMap;
