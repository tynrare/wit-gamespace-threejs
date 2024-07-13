/** @namespace Core */
import * as THREE from "three";
import { InputAction } from "./inputs.js";
import { Vec3Up, cache } from "../math.js";
import Render from "../render.js";

/**
 * creates threejs map controls and pointer click
 *
 * @memberof Core
 * @param {HTMLElement} container .
 * @param {Render} render .
 * @param {function(InputAction, boolean): void} input .
 * @param {function(number, number, string): void} input_analog (x, y, action)
 */
function InputsMap(container, render, input, input_analog) {
  this.run = () => {
    container.addEventListener("pointerdown", pointerdown);
    container.addEventListener("pointerup", pointerup);
  };

  this.stop = () => {
    container.removeEventListener("pointerdown", pointerdown);
    container.removeEventListener("pointerup", pointerup);
  };

	const pointer = new THREE.Vector2();
	const raycaster = new THREE.Raycaster();
	const pos = cache.vec3.v0;
	function click(sx, sy) {
    pointer.x = (sx / container.clientWidth) * 2 - 1;
    pointer.y = -(sy / container.clientHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, render.camera);
    if (raycaster.ray.intersectPlane(new THREE.Plane(Vec3Up), pos)) {
			input_analog(pos.x, pos.z);
    }
	}

	let pdx = 0;
	let pdy = 0;
  function pointerdown(ev) {
    pdx = ev.layerX;
    pdy = ev.layerY;
	}

  function pointerup(ev) {
    const x = ev.layerX;
    const y = ev.layerY;
    const len = Math.sqrt(
      Math.pow(x - pdx, 2) + Math.pow(y - pdy, 2),
    );

    if (len > 10) {
      return;
    }

    click(x, y);
	}
}

export { InputAction, InputsMap };
