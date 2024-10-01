import PageBase from "../../page_base.js";
import { SimpleSession, SimpleSessionElementStyle } from "../simple_session.js";
import SceneBowling from "./scene_bowling.js";
import App from "../../app.js";

class ModeDeathmatchBowling extends PageBase {
  constructor() {
    super();

    /** @type {SceneBowling} */
    this.scene = null;

    /** @type {SimpleSession} */
    this.session = null;
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

    App.instance.start(this.session.container.querySelector("render"));

    const hash = document.location.hash;
    const query = hash.substring(hash.indexOf("?"));
    const urlParams = new URLSearchParams(query);
    const map = urlParams.get("map");

    this.scene = new SceneBowling().init(this.session);

    this.scene.load({ map, logo: false, rand_player_spawnpos: true }).then(() => {
      this.scene.level.bots_active = false;
			this.scene.camera_controls.playstart(this.scene.level.pawn.pawn_dbg_mesh);
    });
  }

  playstart() {
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
