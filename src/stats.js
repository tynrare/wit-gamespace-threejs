import { format_time } from "./utils.js";

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
    this.print_el = document.getElementById("print_stat");
    this.loading_el = document.getElementById("loading_stat");
    this.elapsed_el = document.getElementById("elapsed_stat");
    this.elapsed_total_el = document.getElementById("elapsed_total_stat");
    this.elapsed_play_el = document.getElementById("elapsed_play_stat");
    this.elapsed_play_total_el = document.getElementById("elapsed_play_total_stat");
  }

  show_fps(dt) {
    this.fps_el.innerHTML = `${Math.round(1000 / dt)} fps`;
  }

  show_elapsed(elapsed) {
    this.elapsed_el.innerHTML = format_time(elapsed);
  }

  show_elapsed_global(elapsed) {
    this.elapsed_total_el.innerHTML = format_time(elapsed);
  }

  show_elapsed_play(elapsed) {
    this.elapsed_play_el.innerHTML = format_time(elapsed);
  }

  show_elapsed_play_global(elapsed) {
    this.elapsed_play_total_el.innerHTML = format_time(elapsed);
  }

  show_loading(active) {
    this.loading_el.classList[active ? "remove" : "add"]("hidden");
  }

	print(message) {
		this.print_el.innerHTML = message;
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
