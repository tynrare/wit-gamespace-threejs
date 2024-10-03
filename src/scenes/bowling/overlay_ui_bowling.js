import LevelBowlingA from "./level_bowling.js";
import {
	SimpleSessionElementStyle,
	GenericGuiBarsStats,
} from "../simple_session.js";
import * as THREE from "three";
import { cache, clamp } from "../../math.js";
import App from "../../app.js";
import { config as bconfig } from "./index.js";

const OverlayUiBowlingConfig = {
	show_enemy_energy: false,
	split_bars: true,
	print_nicknames: bconfig.nicknames

}

const OverlayUiBowlingConfig_t = Object.setPrototypeOf({}, OverlayUiBowlingConfig);

class OverlayUiBowling {
	constructor(container) {
		/** @type {LevelBowlingA } **/
		this._level = null;
		/** @type {HTMLElement} **/
		this.container = container;

		/** @type {OverlayUiBowlingConfig} **/
		this.config = Object.setPrototypeOf({}, OverlayUiBowlingConfig_t);

		/** @type {Object<string, GenericGuiBarsStats>} **/
		this.overlays = {};
	}

	step(dt) {
		if (!this._level) {
			return;
		}

		this.container.classList[this.config.split_bars ? "add" : "remove"]("split-bars");

		for (const k in this._level.pawns) {
			const pawn = this._level.pawns[k];
			let ov = this.overlays[k];
			if (pawn.pawn_behaviour.stun_time === Infinity) {
				this.remove_element(k);
				continue;
			}
			if (!ov) {
				ov = this.make_overlay_element(pawn, pawn != this._level.pawn);
				this.container.appendChild(ov.container);
				this.overlays[k] = ov;
			}
			this.set_element_screenpos(ov.container, pawn.pawn_dbg_mesh);
			OverlayUiBowling.set_bars_values(ov, pawn);

			const show_energy = this.config.show_enemy_energy || pawn == this._level.pawn;
			ov.energy.classList[show_energy ? "remove" : "add"]("hidden");
		}
	}

	make_overlay_element(pawn, enemy = true) {
		const root = document.createElement("container");
		root.classList.add("gp-ui-floating", "small");
		const name = document.createElement("label");
		name.classList.add("gp-ui-name");
		const txt = this.config.print_nicknames ? pawn.pawn_visuals.name : pawn.id;
		name.innerHTML = !enemy ? "You" : txt;
		const hearts = document.createElement("container");
		hearts.classList.add("gp-ui-hearts");
		const energy = document.createElement("container");
		energy.classList.add("gp-ui-energy");
		root.appendChild(name);
		root.appendChild(hearts);
		root.appendChild(energy);

		const overlay = new GenericGuiBarsStats({
			hearts_style: SimpleSessionElementStyle.BAR,
			hearts_color: enemy ? "red" : "green"
		});
		overlay.run(root, hearts, energy);

		return overlay;
	}

	static set_bars_values(bars, pawn) {
		const pb = pawn.pawn_behaviour;
		if (pb.config.shoot_limit) {
			const f = pb.shoot_recharge_t / pb.config.shoot_limit_recharge;
			bars.printenergy(pb.config.shoot_limit, pb.shoots_spent - f);
		}
		if (pb.config.hearts_limit) {
			const f = pb.hearts_recharge_t / pb.config.hearts_limit_recharge;
			bars.printhearts(pb.config.hearts_limit, pb.hearts_spent - f);
		}
	}

	set_element_screenpos(element, object) {
		const v = cache.vec3.v0;
		v.copy(object.position);
		const camera = App.instance.render.camera;
		v.project(camera);

		const width = this.container.clientWidth;
		const height = this.container.clientHeight;
		const hw = width * 0.5;
		const hh = height * 0.5;

		v.x = v.x * hw + hw;
		v.y = -(v.y * hh) + hh;
		v.y -= 100;

		const elwidth = element.clientWidth;
		const elheight = element.clientHeight;
		const elhwidth = elwidth * 0.5;
		const elhheight = elheight * 0.5;

		const maxx = width + elhwidth;
		const maxy = height + elhheight;
		v.x = clamp(-elhwidth, maxx, v.x);
		v.y = clamp(-elhheight, maxy, v.y);

		const outscreen =
			v.x == -elhwidth || v.x == maxx || v.y == -elhheight || v.y == maxy;
		element.classList[outscreen ? "add" : "remove"]("hidden");

		element.style.left = v.x + "px";
		element.style.top = v.y + "px";
	}

	run(level) {
		this._level = level;

		return this;
	}

	remove_element(id) {
		const ov = this.overlays[id];
		if (!ov) {
			return;
		}
		ov.container.parentElement.removeChild(ov.container);
		delete this.overlays[id];
	}

	stop() {
		this._level = null;

		for (const k in this.overlays) {
			this.remove_element(k);
		}
	}
}

export default OverlayUiBowling;
export { OverlayUiBowlingConfig_t, OverlayUiBowling };
