import PageBase from "../page_base.js";
import { SimpleSession, SimpleSessionElementStyle } from "./simple_session.js";
import App from "../app.js";
import Scoreboard from "../scoreboard.js";
import * as THREE from "three";
import { Color, Vector3 } from "three";
import OverlayUiBowling from "./bowling/overlay_ui_bowling.js";
import {
  SUPERPOWERS_BOWLING
} from "./bowling/superpowers_bowling.js";
import logger from "../logger.js";
import SceneBowling from "./bowling/scene_bowling.js";

const PLAYLIST_BOWLING = {
  dust2: {
    header: "Dust 2",
    description: "Not that one",
    href: "dust2"
  }
}

class PageSplashscreenBowling extends PageBase {
  constructor() {
    super();
    
    /** @type {SceneBowling} */
    this.scene = null;

    /** @type {SimpleSession} */
    this.session = null;

    /** @type {OverlayUiBowling} */
    this.overlay_ui = null;

    this.gameover_elapsed = 0;

    this.score = 0;

  }

  step(dt) {
    this.scene.step(dt);

    const pb = this.scene.level.pawn.pawn_behaviour;
    if (pb.dead && this.inplay) {
      this.gameover_elapsed += dt;
      if (this.gameover_elapsed >= 3000) {
        this.playstop();
      }
    }
    
    this.overlay_ui.step(dt);
    OverlayUiBowling.set_bars_values(
      this.session.generic_bars,
      this.scene.level.pawn,
    );
  }

  run() {
    this.score = 0;

    App.instance.spashscreen(true);
    App.instance.start(this.container.querySelector("render"));

    this.session = new SimpleSession(
      {
        hearts_style: SimpleSessionElementStyle.BAR,
      },
      "bowling-xd0",
      SUPERPOWERS_BOWLING,
      //PLAYLIST_BOWLING
    ).init(this.container, () => this.playstart());

    this.overlay_ui = new OverlayUiBowling(this.session.ui);

    this.scene = new SceneBowling().init(this.session);
    this.scene.load().then(() => {
      App.instance.spashscreen(false);
    })
  }

  playstart() {
    this.inplay = true;
    this.gameover_elapsed = 0;
    this.scene.play();
    this.scene.reset();

    this.overlay_ui.run(this.scene.level);
  }

  playstop() {
    this.inplay = false;
    this.scene.stop();
    this.session.endplay(this.score);
    this.overlay_ui.stop();
  }

  stop() {
    App.instance.pause();
		this.superpowers = {};
		this.playstop();

    this.session?.dispose();
    this.scene?.dispose();
    this.scene = null;
    this.session = null;
  }
}

export default PageSplashscreenBowling;
