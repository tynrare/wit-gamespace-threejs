class Stats {
  static _instance;

	constructor() {
		/** @type {HTMLElement} */
		this.fps_el = null;
		/** @type {HTMLElement} */
		this.loading_el = null;
	}

	init() {
		this.fps_el = document.getElementById("fps_stat");
		this.loading_el = document.getElementById("loading_stat");
	}

	show_fps(dt) {
		this.fps_el.innerHTML = `${Math.round(1000 / dt)} fps`
	}

	show_loading(active) {
		this.loading_el.classList[active ? "remove" : "add"]("hidden");
	}

  /**
   * @returns {Stats} .
   */
  static get instance() {
    if (!Stats._instance) {
      Stats._instance = new Stats();
    }

    return Stats._instance;
  }
}

export default Stats;
