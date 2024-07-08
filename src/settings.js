/** @namespace Core */
import Datawork from "./datawork.js";

class Settings {
	constructor() {
		this.datawork = new Datawork("settings");
	}

	get render_quality() {
		return this.datawork.load("render_quality") || 1;
	}

	set render_quality(v) {
		this.datawork.save("render_quality", v);
	}

	get antialias() {
		return this.datawork.load("antialias") == 1 ? false : true;
	}

	/**
	 * @param {boolean} v
	 */
	set antialias(v) {
		this.datawork.save("antialias", v === false ? 1 : 2);
	}
}

export default Settings;
