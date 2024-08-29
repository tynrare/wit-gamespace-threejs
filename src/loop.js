/** @namespace Core */
import logger from "./logger.js";
import { lerp } from "./math.js";
import Stats from "./stats.js";

/**
 * @class Loop
 * @memberof Core
 */
class Loop {
  constructor() {
    this.active = false;
    this.paused = true;
    this.timestamp = -1;
    this.framelimit = 16;
		/** @type {function(number): void} */
		this.step = null;

    /**
     * in threejs dt has to be lerped for proper smooth movemets
     *
     * @type {number}
     */
    this.ldt = 100;
  }

	start() {
		this.paused = false;
		logger.log("Loop started");
	}

	pause() {
		this.paused = true;
		logger.log("Loop paused");
	}

  run() {
    this.active = true;
    this.timestamp = performance.now();
    this.loop();

    return this;
  }

	stop() {
		this.pause();
		this.active = false;
		this.step = null;
		logger.log("Loop stopped");
	}

  loop() {
    if (!this.active) {
      return;
    }

    try {
      const now = performance.now();
      const dt = Math.min(100, now - this.timestamp);
      if (dt < this.framelimit) {
        requestAnimationFrame(this.loop.bind(this));
        return;
      }
      this.ldt = lerp(this.ldt, dt, 1e-1);
      this.timestamp = now;

			if (!this.paused && this.step) {
				this.step(this.ldt);
			}

			requestAnimationFrame(this.loop.bind(this));
    } catch (err) {
      this.active = false;
			this.paused = true;
      logger.error("Loop::step error - ", err);
    }
  }
}

export default Loop;
