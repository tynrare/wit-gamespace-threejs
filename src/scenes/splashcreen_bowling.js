import PageBase from "../page_base.js";
import { SimpleSession, SimpleSessionElementStyle } from "./simple_session.js";
import App from "../app.js";
import Scoreboard from "../scoreboard.js";
import {
  SUPERPOWERS_BOWLING
} from "./bowling/superpowers_bowling.js";
import logger from "../logger.js";
import SceneBowling from "./bowling/scene_bowling.js";
import playset_bowling from "../playset_bowling.js"


class PageSplashscreenBowling extends PageBase {
  constructor() {
    super();
    
    /** @type {SceneBowling} */
    this.scene = null;

    /** @type {SimpleSession} */
    this.session = null;

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
  }

  run() {
    this.score = 0;

    this.session = new SimpleSession(
      {
        hearts_style: SimpleSessionElementStyle.BAR,
      },
      "bowling-xd0",
      SUPERPOWERS_BOWLING,
      playset_bowling
    ).init(this.container, () => this.playstart());

    App.instance.start(this.session.container.querySelector("render"));

    this.scene = new SceneBowling().init(this.session);
    this.scene.load();
  }

  playstart() {
    this.inplay = true;
    this.gameover_elapsed = 0;
    this.scene.play();
    this.scene.reset();
  }

  playstop() {
    this.inplay = false;
    this.scene.stop();
    this.session.endplay(this.score);
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
