import Scoreboard from "../scoreboard.js";
import App from "../app.js";

/** @enum {number} */
const SimpleSessionState = {
  MENU: 0,
  PLAY: 1,
};

class SimpleSession {
  constructor() {
    /** @type {SimpleSessionState} */
    this.state = SimpleSessionState.MENU;
  }
  /**
   * @param {HTMLElement} container .
   * @param {function} onplay .
   */
  init(container, onplay) {
    const ui = container.querySelector(".gp-ui");
    const menu = container.querySelector(".gp-menu");
    const inputs = container.querySelector(".gp-inputs");
    const hearts = ui.querySelector(".gp-ui-hearts");
    const energy = ui.querySelector(".gp-ui-energy");
    const score = ui.querySelector(".gp-ui-score .score");
    const playbtn = menu.querySelector(".playbtn");
    const scoreboard = menu.querySelector(".scoreboard");

    this.container = container;
    this.ui = ui;
    this.menu = menu;
    this.inputs = inputs;
    this.hearts = hearts;
    this.energy = energy;
    this.score = score;
    this.playbtn = playbtn;
    this.scoreboard = scoreboard;
    this.onplay = onplay;

    this._playbtn_click_event = this.startplay.bind(this);
    playbtn.addEventListener("click", this._playbtn_click_event);

    this.startmenu();
    this.printscore(0);

    return this;
  }

  startmenu() {
    this.playbtn.classList.add("show");
    this.ui.classList.add("hidden");
    this.inputs.classList.add("hidden");
    this.scoreboard.classList.remove("hidden");

    Scoreboard.instance.get_rating().then((r) => {
      this.scoreboard.innerHTML = Scoreboard.instance.construct_scoreboard(r);
    });

    this.state = SimpleSessionState.MENU;
  }

  startplay() {
    if (this.state == SimpleSessionState.PLAY) {
      return;
    }

    App.instance.fullscreen(true, this.container);

    this.state = SimpleSessionState.PLAY;

    this.onplay();

    this.playbtn.classList.remove("show");
    this.inputs.classList.remove("hidden");
    this.ui.classList.remove("hidden");
    this.scoreboard.classList.add("hidden");
  }

  endplay(score) {
    Scoreboard.instance.save_score(score).then(() => this.startmenu());
  }

  printscore(score) {
    this.score.innerHTML = score;
  }

  printhearts(total, hurt) {
    for (let i = 0; i < Math.max(total, this.hearts.children.length); i++) {
      let h = this.hearts.children[i];
      if (!h) {
        h = document.createElement("pic");
        h.classList.add("heart");
        this.hearts.appendChild(h);
      }
      h.classList[i >= total ? "add" : "remove"]("hidden");
      h.classList[i >= total - hurt ? "add" : "remove"]("disabled");
    }
  }

  printenergy(total, spent) {
		const max = Math.max(total, this.energy.children.length);
    for (let i = 0; i < max; i++) {
      let h = this.energy.children[i];
      if (!h) {
        h = document.createElement("bar");
        this.energy.appendChild(h);
      }
      h.classList[i >= total ? "add" : "remove"]("hidden");
      h.classList[i >= total - spent ? "add" : "remove"]("disabled");
			const progress = Math.min(total - i - spent, 1) * 100;
			h.style.setProperty("--progress", progress + "%");
    }
  }

  dispose() {
    this.playbtn.removeEventListener("click", this._playbtn_click_event);
    this._playbtn_click_event = null;
  }
}

export { SimpleSession, SimpleSessionState };
export default SimpleSession;
