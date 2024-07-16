/** @namespace Pages */

import PageBase from "./page_base.js";
import Settings from "./settings.js";
import App from "./app.js";

/**
 * @class PageSettings
 * @memberof Pages
 */
class PageSettings extends PageBase {
  constructor() {
    super();
  }

  run() {
    this._click_event_listener = this.click.bind(this);
    this.container.addEventListener("click", this._click_event_listener);

		this.update();
  }

	update() {
    const settings = App.instance.settings;
    this.container.querySelector("#btn_render_quality").innerHTML =
      "render quality: " + settings.render_quality;
    this.container.querySelector("#btn_antialias").innerHTML = "antialias: " + (settings.antialias ? '✓' : '✗');
    this.container.querySelector("#btn_debug").innerHTML = "debug: " + (settings.debug ? '✓' : '✗');
	}

  click(ev) {
    const name = ev.target.id;
    const settings = App.instance.settings;
		console.log(name);
    switch (name) {
      case "btn_render_quality":
        let rq = settings.render_quality * 0.5;
        if (rq < 0.10) {
          rq = 1;
        }
        settings.render_quality = rq;
        break;
      case "btn_antialias":
				settings.antialias = !settings.antialias;
        break;
      case "btn_debug":
				settings.debug = !settings.debug;
        break;
      default:
        break;
    }

		this.update();
  }
  stop() {
    this.container.removeEventListener("click", this._click_event_listener);
  }
}

export default PageSettings;
