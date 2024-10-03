import PageBase from "../../page_base.js";
import * as THREE from "three";
import { SimpleSession, SimpleSessionElementStyle } from "../simple_session.js";
import SceneBowling from "./scene_bowling.js";
import App from "../../app.js";
import { config } from "./index.js";

class ModeDeathmatchBowling extends PageBase {
  constructor() {
    super();

    /** @type {SceneBowling} */
    this.scene = null;

    /** @type {SimpleSession} */
    this.session = null;

		this.score = {};
		this.goalscore = 5;
  }

	routine() {
		let print = false;
		for (const k in this.scene.level.pawns) {
			const p = this.scene.level.pawns[k];
			if (p.pawn_behaviour.dead) {
				print = true;
				this.score[p.pawn_behaviour.killedby] += 1;
				this.scene.level.respawn_pawn(k);
			}
		}
		if (print) {
			this.print_rating();
		}
	}

	print_rating() {
		const rating = [];
		for (const k in this.score) {
			const p = this.scene.level.pawns[k];
			const txt = config.nicknames ? p.pawn_visuals.name : p.id;
			const name = p == this.scene.level.pawn ? "You" : txt;
			rating.push({
				name,
				score: this.score[k]
			});
		}

		this.session.printrating(rating);
	}

  step(dt) {
    this.scene.step(dt);
  }

  run() {
    this.session = new SimpleSession(
      {
        hearts_style: SimpleSessionElementStyle.BAR,
      },
      "bowling-xd0"
    ).init(this.container, () => this.playstart());
    this.session.backbtn.classList.remove("hidden");
    this.session.superbtn.classList.add("hidden");
    this.session.backbtn.href = "#splashscreen_bowling";
    this.session.playbtn.innerHTML = "READY.";
		this.session.ratingboard.classList.remove("hidden");
		this.session.printscore(this.goalscore);

    App.instance.start(this.session.container.querySelector("render"));

    const hash = document.location.hash;
    const query = hash.substring(hash.indexOf("?"));
    const urlParams = new URLSearchParams(query);
    const map = urlParams.get("map");

    this.scene = new SceneBowling().init(this.session);

    this.scene.load({ floor: false, map, logo: false, rand_player_spawnpos: true }).then(() => {
      this.scene.level.bots_active = false;
			this.scene.camera_controls.playstart(this.scene.level.pawn.pawn_dbg_mesh);

			const bounds_min = new THREE.Vector2().set(-15, -15);
			const bounds_max = new THREE.Vector2().set(15, 15);
			this.scene.camera_controls.set_bounds(bounds_min, bounds_max);
    });
  }

  playstart() {
		this.score = {};
		for (const k in this.scene.level.pawns) {
			const p = this.scene.level.pawns[k];
			this.score[k] = 0;
		}
		this.print_rating();
    this.scene.play();
    this.scene.level.bots_active = true;
  }

  playstop() {
    this.inplay = false;
    this.scene.stop();
    this.session.endplay(this.score);
    this.scene.level.bots_active = false;
  }

  stop() {
    App.instance.pause();
    this.playstop();

    this.session?.dispose();
    this.scene?.dispose();
    this.scene = null;
    this.session = null;
  }
}

export default ModeDeathmatchBowling;
