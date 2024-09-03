import Datawork from "./datawork.js";

class Session {
	constructor(name = "x") {
		this.name = name;
		this.datawork = new Datawork(name);
		this.timestamp_start = 0;
		this.timestamp_stop = 0;
		this._selapsed = 0;
		this.sessions = 0;
		this.load();
		this.stop();
	}

	start() {
		this.timestamp_stop = 0;
		this.timestamp_start = performance.now();
		this.load();
	}

	stop() {
		this.timestamp_stop = performance.now();
		this.sessions += 1;
		this.save();
	}

	_load_key(key) {
		return this.datawork.load(key);
	}

	_save_key(key, value) {
		this.datawork.save(key, value);
	}

	load() {
		this._selapsed = this._load_key("selapsed");
		this.sessions = this._load_key("ssessions");
	}

	save() {
		this._save_key("selapsed", this.elapsed_global);
		this._save_key("ssessions", this.sessions);
	}

	get elapsed() {
		if (this.timestamp_stop) {
			return this.timestamp_stop - this.timestamp_start;
		}

		return performance.now() - this.timestamp_start;
	}

	get elapsed_global() {
		return this._selapsed + this.elapsed;
	}
}

export default Session;
