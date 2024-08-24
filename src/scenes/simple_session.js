import Scoreboard from "../scoreboard.js";
import App from "../app.js";

/** @enum {number} */
const SimpleSessionState = {
  MENU: 0,
  PLAY: 1,
};

const SimpleSessionElementStyle = {
	PIC: 0,
	BAR: 1
}

class GenericGuiBarsStats {
  constructor(opts = {
		hearts_style: SimpleSessionElementStyle.PIC,
		energy_style: SimpleSessionElementStyle.BAR,
	}) {
		this.hearts_style = opts?.hearts_style ?? SimpleSessionElementStyle.PIC;
		this.energy_style = opts?.energy_style ?? SimpleSessionElementStyle.BAR;
	}

	run(container, hearts, energy) {
		this.container = container;
		this.hearts = hearts;
		this.energy = energy;

		this.hearts.innerHTML = "";
		this.energy.innerHTML = "";
    this.printhearts(3, 0);
    this.printenergy(2, 0);
	}

  printhearts(total, hurt) {
    for (let i = 0; i < Math.max(total, this.hearts.children.length); i++) {
      let h = this.hearts.children[i];
      if (!h) {
				h = this._make_heart_element();
        this.hearts.appendChild(h);
      }
      h.classList[i >= total ? "add" : "remove"]("hidden");
      h.classList[i >= total - hurt ? "add" : "remove"]("disabled");
    }
  }

	_make_heart_element() {
		switch(this.hearts_style) {
			case SimpleSessionElementStyle.PIC: {
        const h = document.createElement("pic");
        h.classList.add("heart");
				return h;
			}
			case SimpleSessionElementStyle.BAR: {
        const h = document.createElement("bar");
        h.classList.add("pink");
				return h;
			}
		}
	}

  printenergy(total, spent) {
		const max = Math.max(total, this.energy.children.length);
    for (let i = 0; i < max; i++) {
      let h = this.energy.children[i];
      if (!h) {
        h = this._make_energy_element();
        this.energy.appendChild(h);
      }
      h.classList[i >= total ? "add" : "remove"]("hidden");
      h.classList[i >= total - spent ? "add" : "remove"]("disabled");
			const progress = Math.min(total - i - spent, 1) * 100;
      h.classList[progress < 100 ? "add" : "remove"]("muted");
			h.style.setProperty("--progress", progress + "%");
    }
  }

	_make_energy_element() {
		switch(this.energy_style) {
			case SimpleSessionElementStyle.PIC: {
        const h = document.createElement("pic");
        h.classList.add("circle");
				return h;
			}
			case SimpleSessionElementStyle.BAR: {
        const h = document.createElement("bar");
        h.classList.add("blue");
				return h;
			}
		}
	}
}

class SimpleSession {
  constructor(opts = {
		hearts_style: SimpleSessionElementStyle.PIC,
		energy_style: SimpleSessionElementStyle.BAR,
	}) {
    /** @type {SimpleSessionState} */
    this.state = SimpleSessionState.MENU;

    /** @type {GenericGuiBarsStats} */
		this.generic_bars = new GenericGuiBarsStats(opts);
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
		this.generic_bars.run(null, this.hearts, this.energy);

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
		this.generic_bars.printhearts(total, hurt);
	}
  printenergy(total, spent) {
		this.generic_bars.printenergy(total, spent);
	}

  dispose() {
    this.playbtn.removeEventListener("click", this._playbtn_click_event);
    this._playbtn_click_event = null;
  }
}

export { SimpleSession, SimpleSessionState, SimpleSessionElementStyle, GenericGuiBarsStats };
export default SimpleSession;