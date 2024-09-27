import ConfigBowling from "./config_bowling.js";
import { InputAction, InputsDualstick } from "../../pawn/inputs_dualstick.js";
import LevelBowlingA from "./level_bowling.js";
import CameraBowlingA from "./camera_bowling.js";
import App from "../../app.js";
import SimpleSession from "../simple_session.js";
import {
  SUPERPOWERS_CLASSES,
} from "./superpowers_bowling.js";
import { cache, Vec3Up } from "../../math.js";
import OverlayUiBowling from "./overlay_ui_bowling.js";
import logger from "../../logger.js";

class SceneBowling {
  constructor() {
    this.config = new ConfigBowling();

    /** @type {InputsDualstick} */
    this.inputs = null;
    /** @type {LevelBowlingA} */
    this.level = null;
    /** @type {CameraBowlingA} */
    this.camera_controls = null;
    /** @type {OverlayUiBowling} */
    this.overlay_ui = null;

    /** @type {SimpleSession} */
    this._session = null;

    this.loaded = false;
    this.inplay = false;

    this.superpowers = {};
  }

  step(dt) {
    if (!this.loaded) {
        return;
    }
    this.level.step(dt);
    this.camera_controls.step(dt);
    this.overlay_ui.step(dt);

    this.apply_superpowers(dt);

    OverlayUiBowling.set_bars_values(
      this._session.generic_bars,
      this.level.pawn,
    );
  }

  reset() {
    for (const k in this.level.pawns) {
      const pawn = this.level.pawns[k];
      pawn.pawn_behaviour.revive();
    }

    for (const k in this.level.projectiles) {
      this.level.remove_projectile(k);
    }
  }

  play() {
    this.inplay = true;

    this.camera_controls.playstart(this.level.pawn.pawn_dbg_mesh);

    this.inputs = new InputsDualstick(
      this._session.container,
      this._session.container, 
      this.input.bind(this),
      this.input_analog.bind(this)
    );
    this.inputs.run();

    this.overlay_ui.run(this.level);
  }

  stop() {
    this.inplay = false;
    this.camera_controls.playstop();
    this.inputs?.stop();
    this.inputs = null;
    this.overlay_ui.stop();
  }

  /**
   * @param {SimpleSession} session 
   * @returns {SceneBowling} this
   */
  init(session) {
    this._session = session;
    this.config.run();

    this.level = new LevelBowlingA();
    this.camera_controls = new CameraBowlingA().run();

    this.overlay_ui = new OverlayUiBowling(this._session.ui);

    this.loaded = false;


    return this;
  }

  async load(opts = { map: null, logo: true }) {
    App.instance.splashscreen(true);

    return this.level.run(opts).then(() => {
      this.loaded = true;
    }).catch((e) => {
      logger.error("level loading error, ", e)
    }).finally(() => {
      App.instance.splashscreen(false);
    })
  }

  dispose() {
    this.stop();
    this.level?.stop();
    this.level = null;
    
    this.camera_controls?.playstop();
    this.camera_controls = null;
    this._session = null;
    this.overlay_ui = null;
  }

  input(type, start) {
    this.level.pawn.action(type, start);
    if (this.config.generic.zoom_on_aim) {
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

  apply_superpowers(dt) {
    for (const k in this._session.superpowers_list) {
      const enabled = this._session.superpowers_list[k];
      this.apply_superpower(dt, enabled, k);
    }
  }

  apply_superpower(dt, enabled, key) {
    let sp = this.superpowers[key];
    if (sp && enabled) {
      sp.step(dt);
      return;
    } else if (sp && !enabled) {
      sp.disable();
      this.superpowers[key] = null;
      logger.log(`Superpower ${key} disabled`);
      return;
    } else if (!enabled) {
      return;
    }

    sp = new SUPERPOWERS_CLASSES[key](this);
    this.superpowers[key] = sp;
    sp.enable();
    logger.log(`Superpower ${key} activated`);
  }
}

export default SceneBowling;
