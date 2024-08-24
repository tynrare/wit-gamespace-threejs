import PageBase from "../page_base.js";
import { SimpleSession, SimpleSessionElementStyle } from "./simple_session.js";
import { InputAction, InputsDualstick } from "../pawn/inputs_dualstick.js";
import App from "../app.js";
import Scoreboard from "../scoreboard.js";
import LevelBowlingA from "./bowling/level_bowling.js";
import * as THREE from "three";
import { Color, Vector3 } from "three";
import CameraBowlingA from "./bowling/camera_bowling.js";
import { cache, Vec3Up } from "../math.js";
import OverlayUiBowling from "./bowling/overlay_ui_bowling.js";

class PageSplashscreenBowling extends PageBase {
	constructor() {
		super();

		this.config = {
			zoom_on_aim: true
		}

		/** @type {SimpleSession} */
		this.session = null;
		/** @type {InputsDualstick} */
		this.inputs = null;
		/** @type {LevelBowlingA} */
		this.level = null;
		/** @type {CameraBowlingA} */
		this.camera_controls = null;

		/** @type {OverlayUiBowling} */
		this.overlay_ui = null;

		this.loaded = false;

		this.score = 0;
	}

	step(dt) {
		if (!this.loaded) {
			return;
		}

		this.level.step(dt);
		this.camera_controls.step(dt);
		this.overlay_ui.step(dt);
		OverlayUiBowling.set_bars_values(this.session.generic_bars, this.level.pawn);
	}

	input(type, start) {
		this.level.pawn.action(type, start);
		if (this.config.zoom_on_aim) {
			this.camera_controls.controls.zoom(type == InputAction.action_b && start);
		}
	}

	/**
	 * @param {number} x .
	 * @param {number} x .
	 * @param {string} tag .
	 * @param {InputAction} type .
	 */
	input_analog(x, y, tag, type) {
		const v = cache.vec3.v0;
		const p = cache.vec3.v1;
		App.instance.render.camera.getWorldDirection(v);
		const camera_rot = Math.atan2(v.x, v.z);
		p.set(x, 0, y).applyAxisAngle(Vec3Up, camera_rot);
		this.level.pawn.action_analog(p.x, p.z, type);
	}

	run() {
		this.loaded = false;
		this.score = 0;

		const render = App.instance.render;

		App.instance.spashscreen(true);
		App.instance.start(this.container.querySelector("render"));

		this.session = new SimpleSession({
			hearts_style: SimpleSessionElementStyle.BAR
		}).init(this.container, () =>
			this.playstart(),
		);

		this.level = new LevelBowlingA();
		this.camera_controls = new CameraBowlingA().run();

		this.overlay_ui = new OverlayUiBowling(this.session.ui);

		this.load();
	}

	async load() {
		await this.level.run();
		App.instance.spashscreen(false);
		this.loaded = true;
	}

	playstart() {
		this.camera_controls.playstart(this.level.pawn.pawn_dbg_mesh);

		this.inputs = new InputsDualstick(
			this.container,
			this.container,
			this.input.bind(this),
			this.input_analog.bind(this),
		);
		this.inputs.run();

		this.overlay_ui.run(this.level);
	}

	playstop() {
		this.camera_controls.playstop();
		this.session.endplay(this.score);
		this.inputs.stop();
		this.overlay_ui.stop();
		this.inputs = null;
	}

	stop() {
		App.instance.pause();

		this.session?.dispose();
		this.level?.stop();
		this.camera_controls?.playstop();
		this.session = null;
		this.level = null;
		this.camera_controls = null;
	}
}

export default PageSplashscreenBowling;