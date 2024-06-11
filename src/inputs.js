/** @namespace Core */
import App from "./app.js";
import { AppConfig } from "./config.js";

/**
 * @memberof core
 * @enum {number}
 */
const InputAction = {
  left: 0,
  up: 1,
  right: 2,
  down: 3,
  action_a: 4,
  action_b: 5,
  action_c: 6,
  action_d: 7,
  action_f: 8,
  action_shift: 9,
  action_esc: 10,
  action_cmd: 11,
  action_enter: 12,
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

  canvas.addEventListener("touchstart", pointerdown, { passive: false });
  canvas.addEventListener("mousedown", pointerdown);
  canvas.addEventListener("touchend", pointerup, { passive: false });
  canvas.addEventListener("mouseup", pointerup);
  canvas.addEventListener("touchmove", pointermove, { passive: false });
  canvas.addEventListener("mousemove", pointermove);

  /**
   * @typedef JoystickEl
   * @property {HTMLElement} element
   * @property {HTMLElement} pimp
   * @property {HTMLElement} deadzone
   * @property {number} start_x
   * @property {number} start_y
   * @property {number} dx
   * @property {number} dy
   * @property {boolean} pointer_down
   * @property {boolean} input_activated
   * @property {number} touch_identifier
   * @property {string} tag
   */

  /** @type {Object<string, JoystickEl>} */
  const joysticks = {};

  /**
	 * @param {string} tag
	 * @param {string?} [id]
   * @returns {JoystickEl} .
   */
  const access_joystick = (tag, id) => {
    if (joysticks[tag]) {
      return joysticks[tag];
    }

    let joystick_root = document.getElementById(id);
    /** @type {HTMLElement} */
    let joystick_el = joystick_root.querySelector(".screen_joystick");
    /** @type {HTMLElement} */
    let joystick_pimp_el = joystick_root.querySelector(".screen_joystick_pimp");
    /** @type {HTMLElement} */
    let joystick_deadzone_el = joystick_root.querySelector(
      ".screen_joystick_deadzone ",
    );

    /** @type {JoystickEl} */
    const joystick = {
      element: joystick_el,
      pimp: joystick_pimp_el,
      deadzone: joystick_deadzone_el,
      start_x: 0,
      start_y: 0,
      dx: 0,
      dy: 0,
      pointer_down: false,
      // thresholds tap input
      input_activated: false,
			touch_identifier: -1,
			tag
    };

    joysticks[tag] = joystick;

    return joystick;
  };

	const tag_to_action = {
		"movement": InputAction.action_a,
		"attack": InputAction.action_b
	}

	access_joystick('movement', "screen_joystic_movement");
	access_joystick('attack', "screen_joystic_attack");

  function loop() {
    requestAnimationFrame(loop);

    const joystick_movement = access_joystick("movement");
    const joystick_attack = access_joystick("attack");

		if (joystick_movement.pointer_down) {
			const w = joystick_movement.element.clientWidth;
			const h = joystick_movement.element.clientHeight;
			const dx = joystick_movement.dx;
			const dy = joystick_movement.dy;
			app.input_analog((dx / w) * 2, (dy / h) * 2, "movement");
		}

		if (joystick_attack.pointer_down) {
			const w = joystick_attack.element.clientWidth;
			const h = joystick_attack.element.clientHeight;
			const dx = joystick_attack.dx;
			const dy = joystick_attack.dy;
			app.input_analog((dx / w) * 2, (dy / h) * 2, "attack");
		}
  }
  loop();

  /**
   * @param {TouchEvent|MouseEvent} ev
   */
  function pointerdown(ev) {
    const start_x = ev.clientX ?? ev.changedTouches[0]?.clientX ?? 0;
    const start_y = ev.clientY ?? ev.changedTouches[0]?.clientY ?? 0;
		const touch_identifier = (ev.changedTouches && ev.changedTouches[0]?.identifier) ?? 0;

    /** @type {JoystickEl} */
		let joystick = null;
		if (start_x < canvas.clientWidth / 2) {
			joystick = access_joystick("movement");
		} else {
			joystick = access_joystick("attack");
		}

		if (joystick.pointer_down) {
			return;
		}

    joystick.pointer_down = true;
		joystick.touch_identifier = touch_identifier;
		joystick.start_x = start_x;
		joystick.start_y = start_y;

    joystick.element.classList.add("visible");

    joystick.element.style.left = start_x + "px";
    joystick.element.style.top = start_y + "px";
    joystick.pimp.style.left = start_x + "px";
    joystick.pimp.style.top = start_y + "px";

    const threshold = AppConfig.instance.input_movement_threshold;
    joystick.deadzone.style.width = threshold * 100 + "%";
    joystick.deadzone.style.height = threshold * 100 + "%";

		app.input(tag_to_action[joystick.tag], true);

    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

	function apply_move(x, y, touch_identifier) {
		/** @type {JoystickEl} */
		let joystick = null;
		for(const k in joysticks) {
			const j = joysticks[k];
			if (j.touch_identifier === touch_identifier) {
				joystick = j;
			}
		}

		if (!joystick?.pointer_down) {
			return;
		}

    let ldx = joystick.start_x - x;
    let ldy = joystick.start_y - y;

    if (!joystick.input_activated) {
      const w = joystick.deadzone.clientWidth;
      const h = joystick.deadzone.clientHeight;
      const pdx = (ldx / w) * 2;
      const pdy = (ldy / h) * 2;
      const d = Math.sqrt(pdx * pdx + pdy * pdy);
      const rdx = pdx * Math.max(1, d);
      const rdy = pdy * Math.max(1, d);
      if (Math.abs(rdx) > 0.9 || Math.abs(rdy) > 0.9) {
        joystick.input_activated = true;
      }
    }

    const w = joystick.element.clientWidth;
    const h = joystick.element.clientHeight;
    const pdx = (ldx / w) * 2;
    const pdy = (ldy / h) * 2;
    const d = Math.sqrt(pdx * pdx + pdy * pdy);
    if (joystick.input_activated) {
      joystick.pimp.classList.add("visible");
      joystick.element.classList.add("active");
      joystick.dx = ldx / Math.max(1, d);
      joystick.dy = ldy / Math.max(1, d);
    }

    const rdx = Math.min(1, pdx / Math.max(1, d));
    const rdy = Math.min(1, pdy / Math.max(1, d));
    joystick.pimp.style.left = joystick.start_x - (rdx * w) / 2 + "px";
    joystick.pimp.style.top = joystick.start_y - (rdy * h) / 2 + "px";
	}

  function pointermove(ev) {
		if (ev.touches?.length) {
			for (let i = 0; i < ev.touches?.length; i++) {
				const touch = ev.touches[i];
				const touch_identifier = touch.identifier;
				apply_move(touch.clientX, touch.clientY, touch_identifier);
			}
		} else {
			apply_move(ev.clientX, ev.clientY, 0);
		}

    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  function pointerup(ev) {
		const touch_identifier = (ev.changedTouches && ev.changedTouches[0]?.identifier) ?? 0;

		/** @type {JoystickEl} */
		let joystick = null;
		for(const k in joysticks) {
			const j = joysticks[k];
			if (j.pointer_down && j.touch_identifier === touch_identifier) {
				joystick = j;
			}
		}

		if (!joystick) {
			return;
		}

    joystick.pointer_down = false;
    joystick.input_activated = false;
    joystick.touch_identifier = -1;
    joystick.dx = 0;
    joystick.dy = 0;
    joystick.element.classList.remove("visible");
    joystick.pimp.classList.remove("active");
    joystick.pimp.classList.remove("visible");

		app.input(tag_to_action[joystick.tag], false);
    app.input_analog(0, 0, joystick.tag);

    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  /**
   * @param {KeyboardEvent} ev
   */
  function keydown(ev) {
    if (ev.repeat) return;

    keycode(ev.code, true);
  }
  /**
   * @param {KeyboardEvent} ev
   */
  function keyup(ev) {
    if (ev.repeat) return;

    keycode(ev.code, false);
  }

  const key_to_action = {
    ArrowLeft: InputAction.left,
    KeyA: InputAction.left,
    ArrowRight: InputAction.right,
    KeyD: InputAction.right,
    ArrowUp: InputAction.up,
    KeyW: InputAction.up,
    ArrowDown: InputAction.down,
    KeyS: InputAction.down,
  };
  function keycode(key, start) {
    const action = key_to_action[key] ?? null;
    if (action !== null) {
      app.input(action, start);
    }
  }
}

export { InputAction, run_inputs };
