/** @namespace Core */
import App from "./app.js";
import {AppConfig} from "./config.js";

/**
 * @memberof core
 * @enum {number}
 */
const InputAction = {
  left : 0,
  up : 1,
  right : 2,
  down : 3,
  action_a : 4,
  action_b : 5,
  action_c : 6,
  action_d : 7,
  action_f : 8,
  action_shift : 9,
  action_esc : 10,
  action_cmd : 11,
  action_enter : 12,
};

/**
 * creates keyboard and touch inputs
 *
 * @memberof core
 * @param {App} app .
 */
function run_inputs(canvas, app) {
  document.body.addEventListener("keydown", keydown);
  document.body.addEventListener("keyup", keyup);

  canvas.addEventListener("touchstart", pointerdown, {passive : false});
  canvas.addEventListener("mousedown", pointerdown);
  canvas.addEventListener("touchend", pointerup, {passive : false});
  canvas.addEventListener("mouseup", pointerup);
  canvas.addEventListener("touchmove", pointermove, {passive : false});
  canvas.addEventListener("mousemove", pointermove);

  /** @type {HTMLElement} */
  let joystick_el = document.querySelector("#screen_joystick");
  /** @type {HTMLElement} */
  let joystick_pimp_el = document.querySelector("#screen_joystick_pimp");
  /** @type {HTMLElement} */
  let joystick_deadzone_el =
      document.querySelector("#screen_joystick_deadzone ");

  let start_x = 0;
  let start_y = 0;
  let dx = 0;
  let dy = 0;
  let pointer_down = false;

  // thresholds tap input
  let input_activated = false;

  function loop() {
    requestAnimationFrame(loop);

    if (!pointer_down) {
      return;
    }

    const w = joystick_el.clientWidth;
    const h = joystick_el.clientHeight;
    app.input_analog(dx / w * 2, dy / h * 2);
  }
  loop();

  /**
   * @param {TouchEvent|MouseEvent} ev
   */
  function pointerdown(ev) {
    pointer_down = true;
    start_x = ev.clientX ?? ev.touches[0]?.clientX ?? 0;
    start_y = ev.clientY ?? ev.touches[0]?.clientY ?? 0;

    joystick_el.classList.add("visible");

    joystick_el.style.left = start_x + "px";
    joystick_el.style.top = start_y + "px";
    joystick_pimp_el.style.left = start_x + "px";
    joystick_pimp_el.style.top = start_y + "px";

    const threshold = AppConfig.instance.input_movement_threshold;
    joystick_deadzone_el.style.width = threshold * 100 + "%";
    joystick_deadzone_el.style.height = threshold * 100 + "%";

    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  function pointermove(ev) {
    if (!pointer_down) {
      return;
    }
    const x = ev.clientX ?? ev.touches[0]?.clientX ?? 0;
    const y = ev.clientY ?? ev.touches[0]?.clientY ?? 0;

    let ldx = start_x - x;
    let ldy = start_y - y;

    if (!input_activated) {
      const w = joystick_deadzone_el.clientWidth;
      const h = joystick_deadzone_el.clientHeight;
      const pdx = ldx / w * 2;
      const pdy = ldy / h * 2;
      const d = Math.sqrt(pdx * pdx + pdy * pdy);
      const rdx = pdx * Math.max(1, d);
      const rdy = pdy * Math.max(1, d);
      if (Math.abs(rdx) > 0.9 || Math.abs(rdy) > 0.9) {
        input_activated = true;
      }
    }

    const w = joystick_el.clientWidth;
    const h = joystick_el.clientHeight;
    const pdx = ldx / w * 2;
    const pdy = ldy / h * 2;
    const d = Math.sqrt(pdx * pdx + pdy * pdy);
    if (input_activated) {
      joystick_pimp_el.classList.add("visible");
			joystick_el.classList.add("active");
      dx = ldx / Math.max(1, d);
      dy = ldy / Math.max(1, d);
    }

    const rdx = Math.min(1, pdx / Math.max(1, d));
    const rdy = Math.min(1, pdy / Math.max(1, d));
    joystick_pimp_el.style.left = start_x - rdx * w / 2 + "px";
    joystick_pimp_el.style.top = start_y - rdy * h / 2 + "px";

    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  function pointerup(ev) {
    pointer_down = false;
    input_activated = false;
    dx = 0;
    dy = 0;
    joystick_el.classList.remove("visible");
    joystick_el.classList.remove("active");
    joystick_pimp_el.classList.remove("visible");
    app.input_analog(0, 0);

    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  /**
   * @param {KeyboardEvent} ev
   */
  function keydown(ev) {
    if (ev.repeat)
      return;

    keycode(ev.code, true);
  }
  /**
   * @param {KeyboardEvent} ev
   */
  function keyup(ev) {
    if (ev.repeat)
      return;

    keycode(ev.code, false);
  }

  const key_to_action = {
    ArrowLeft : InputAction.left,
    KeyA : InputAction.left,
    ArrowRight : InputAction.right,
    KeyD : InputAction.right,
    ArrowUp : InputAction.up,
    KeyW : InputAction.up,
    ArrowDown : InputAction.down,
    KeyS : InputAction.down,
  };
  function keycode(key, start) {
    const action = key_to_action[key] ?? null;
    if (action !== null) {
      app.input(action, start);
    }
  }
}

export {InputAction, run_inputs};
