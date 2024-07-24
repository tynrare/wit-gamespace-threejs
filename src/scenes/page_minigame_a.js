/** @namespace Pages/Scenes */

import PageBase from "../page_base.js";
import App from "../app.js";
import { format_time } from "../utils.js";
import Scoreboard from "../scoreboard.js";

/**
 * @class PageMinigameA
 * @memberof Pages/Scenes
 */
class PageMinigameA extends PageBase {
  constructor() {
    super();

    /** @type {HTMLElement} */
    this.text_el = null;
    /** @type {HTMLElement} */
    this.btn_el = null;
    /** @type {HTMLElement} */
    this.timer_el = null;
    /** @type {HTMLElement} */
    this.scoreboard_el = null;

    this.score = 0;

    this.elapsed = 0;
    this.maxtime = 5; // seconds
    this.state = 0;
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    this.elapsed += dt;
    if (this.state === 1) {
      const time = Math.max(0, this.maxtime * 1000 - this.elapsed);
      this.timer_el.innerHTML = format_time(time);

      if (time <= 0) {
        this.endgame();
      }
    } else if (this.state == 2 && this.elapsed > 1800) {
      this.btn_el.innerHTML = "AGAIN";
    }
  }

  run() {
    App.instance.start();

    this.text_el = this.container.querySelector("#mga_score");
    this.timer_el = this.container.querySelector("#mga_time");
    this.btn_el = this.container.querySelector("#mga_btn");
    this.scoreboard_el = this.container.querySelector("#mga_scoreboard");
    this._btn_el_event_listener = this.tap.bind(this);
    this.btn_el.addEventListener("click", this._btn_el_event_listener);

    this.score = 0;
    this.state = 0;

    this.btn_el.innerHTML = "PLAY";
    this.text_el.innerHTML = this.score;
    this.timer_el.classList.add("hidden");
    this.scoreboard_el.classList.remove("hidden");
    Scoreboard.instance.get_rating().then((r) => {
      this.scoreboard_el.innerHTML =
        Scoreboard.instance.construct_scoreboard(r);
    });
  }

  play() {
    this.btn_el.innerHTML = "SCOREUP";
    this.state = 1;
    this.elapsed = 0;
    this.score = 0;
    this.text_el.innerHTML = this.score;
    this.timer_el.classList.remove("hidden");
    this.scoreboard_el.classList.add("hidden");
  }

  endgame() {
    this.state = 2;
    this.btn_el.innerHTML = "GAMEOVER";
    this.elapsed = 0;

    this.timer_el.classList.add("hidden");
    this.scoreboard_el.classList.remove("hidden");

    Scoreboard.instance.save_score(this.score).then(async () => {
      const r = await Scoreboard.instance.get_rating();
      this.scoreboard_el.innerHTML =
        Scoreboard.instance.construct_scoreboard(r);
    });
  }

  tap() {
    if (this.state === 0) {
      this.play();
    } else if (this.state === 1) {
      this.score += 1;
      this.text_el.innerHTML = this.score;
    } else if (this.state === 2 && this.elapsed > 2000) {
      this.play();
    }
  }

  stop() {
    App.instance.pause();
    this.btn_el.removeEventListener("click", this._btn_el_event_listener);
    this._btn_el_event_listener = null;
  }
}

export default PageMinigameA;
