/** @namespace ty */
import { config } from "./config.js";

import PageBase from "./page_base.js";
import PageMainmenu from "./page_mainmenu.js";
import PageSettings from "./page_settings.js";
import PageSplashscreenBowlingD240727 from "./tests/d240727_bowling/page_splashscreen_bownling.js";
import PageSplashscreenBowling from "./scenes/splashcreen_bowling.js";
import PageSplashscreenBowlingD240823 from "./tests/splashscreen_bowling_d240823.js";
import PageMinigameA from "./scenes/page_minigame_a.js";
import PageBlockbreaker from "./tests/page_blockbreaker.js";

import PageTestcase1 from "./tests/page_testcase1.js";
import PageTestcase2Tanks from "./tests/page_testcase2_tanks.js";
import PageTestcase3 from "./tests/page_testcase3.js";
import PageTestcase4 from "./tests/page_testcase4.js";
import PageTestcase5Navmesh from "./tests/page_testcase5_navmesh.js";
import PageTestcase5aNavmesh from "./tests/page_testcase5a_navmesh.js";
import PageTestcase6NetworkD240829 from "./tests/d240829_network/page_testcase6_network.js";
import PageTestcase6Network from "./tests/page_testcase6_network.js";
import PageTestcase7Vfx from "./tests/page_testcase7_vfx.js";
import AaPageTestcaseBowling from "./tests/deprecated/aa_page_tc_bowling.js";
import AbPageTestcaseBowling from "./tests/deprecated/ab_page_tc_bowling.js";
import AcPageTestcaseBowling from "./tests/deprecated/ac_page_tc_bowling.js";
import AdPageTestcaseBowling from "./tests/d240727_bowling/ad_page_tc_bowling.js";
import AePageTestcaseBowling from "./tests/d240727_bowling/ae_page_tc_bowling.js";
import AePageTestcaseTank from "./tests/d240727_extras/ae_page_tc_tank.js";
import AfPageTestcaseBoulder from "./tests/d240727_extras/af_page_tc_boulder.js";
import BaPageTestcaseVehicle from "./tests/d240727_extras/ba_page_tc_vehicle.js";

import logger from "./logger.js";
import Render from "./render.js";
import Stats from "./stats.js";
import Loop from "./loop.js";
import Session from "./session.js";
import Settings from "./settings.js";
import Scoreboard from "./scoreboard.js";
import ModeDeathmatchBowling from "./scenes/bowling/mode_deathmatch_bowling.js";

/**
 * Core class. Handles hash changes and switches subapps
 *
 * @example App.instance.init().run()
 * @class App
 * @memberof Core
 */
class App {
  /**
   * @private
   */
  constructor() {
    this.config = {
      base_location: "doc",
    };
    this.settings = new Settings();
    /** @type {PageBase} */
    this.activepage = null;
    /** @type {Object<string, PageBase>} */
    this.pages = {
      mainmenu: new PageMainmenu(),
      settings: new PageSettings(),

      splashscreen_bowling: new PageSplashscreenBowling(),
      mode_deathmatch_bowling: new ModeDeathmatchBowling(),

      minigame_a: new PageMinigameA(),
      blockbreaker: new PageBlockbreaker(),

      testcase1: new PageTestcase1(),
      testcase2: new PageTestcase2Tanks(),
      testcase3: new PageTestcase3(),
      testcase4: new PageTestcase4(), // physics
      testcase5: new AaPageTestcaseBowling(),
      testcase6: new AbPageTestcaseBowling(),
      testcase7: new AcPageTestcaseBowling(),
      testcase8: new AdPageTestcaseBowling(),
      testcase9: new AePageTestcaseBowling(),
      testcase10: new AePageTestcaseTank(),
      testcase11: new BaPageTestcaseVehicle(),
      testcase12: new AfPageTestcaseBoulder(),
      testcase13: new PageTestcase5Navmesh(),
      testcase13a: new PageTestcase5aNavmesh(),
      testcase14: new PageTestcase6NetworkD240829(),
      testcase15: new PageTestcase6Network(),
      testcase16: new PageTestcase7Vfx(),

      splashscreen_bowling_d: new PageSplashscreenBowlingD240727(),
      splashscreen_bowling_d240823: new PageSplashscreenBowlingD240823(),
    };

    /** @type {Render} */
    this.render = null;

    /** @type {Loop} */
    this.loop = null;

    /** @type {HTMLElement} */
    this.container = null;

    /** @type {Session} */
    this.session = null;
    /** @type {Session} */
    this.playsession = null;

    this.DEBUG = true;
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    if (this.activepage) {
      this.activepage.step(dt);
    }
    this.render.step(dt);
  }

  routine() {
    if (this.activepage) {
      this.activepage.routine();
    }

    this.session.save();
    this.playsession.save();
    Stats.instance.show_elapsed(this.session.elapsed);
    Stats.instance.show_elapsed_global(this.session.elapsed_global);
    Stats.instance.show_elapsed_play(this.playsession.elapsed);
    Stats.instance.show_elapsed_play_global(this.playsession.elapsed_global);

    Stats.instance.show_fps(this.loop.ldt);
  }

  /**
   * starts loop
   * @param {HTMLElement} container .
   */
  start(container) {
    this.playsession.start();
    if (container) {
      this.render.run(container);
    }
    this.loop.start();
  }

  /**
   * pauses loop
   */
  pause() {
    this.render.stop();
    this.playsession.stop();
    this.loop.pause();
  }

  /**
   * @param {HTMLElement} container .
   */
  init(container) {
    this.container = container;

    this.session = new Session();
    this.playsession = new Session("play");

    this.render = new Render().init();
    this.loop = new Loop();
    this.loop.step = this.step.bind(this);

    Stats.instance.init();

    return this;
  }

  dispose() {
    this.container = null;
    this.render?.dispose();
    this.render = null;
    this.loop?.stop();
    this.loop = null;
    this.session = null;
    this.playsession = null;
  }

  run() {
    this.session.start();
    this.loop.run();

    if (!window.location.hash) {
      window.location.hash = this.config.base_location;
    }

    document.getElementById("splashscreen_loading").classList.add("hidden");

    this.routine();
    this._routine_timer_id = setInterval(this.routine.bind(this), 1000);

    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");
    if (mode === "prod") {
      this.DEBUG = false;
    } else {
      document.getElementById("stats").classList.remove("hidden");
    }

    const server_url = urlParams.get("server");
    const server_token = urlParams.get("token");
    Scoreboard.instance.init(server_url, server_token);

    this.onhashchange();

    this._hashchange_listener = this.onhashchange.bind(this);
    window.addEventListener("hashchange", this._hashchange_listener);

    return this;
  }

  stop() {
    window.removeEventListener("hashchange", this._hashchange_listener);
    this._hashchange_listener = null;

    stopInterval(this._routine_timer_id);
    this._routine_timer_id = null;

    this.closepage();
  }

  openpage(name) {
    const page = this.pages[name];
    if (!page) {
      logger.warn(`App::openpage - page ${name} not found`);
      return;
    }

    const containername = `page#${name}`;
    const container = this.container.querySelector(containername);
    if (!container) {
      logger.error(
        `App::openpage error - no container "${containername}" found`,
      );
      return;
    }

    this.activepage = page.init(container);
    this.activepage.run();

    this.activepage.container.classList.add("target");

    logger.log(`App::openpage - page ${name} opened`);
  }

  closepage() {
    if (!this.activepage) {
      return;
    }

    this.activepage.container?.classList.remove("target");

    try {
      this.activepage.stop();
    } catch (err) {
      logger.warn("Active page stop error:", err);
    }
    try {
      this.activepage.dispose();
    } catch (err) {
      logger.warn("Active page dispose error:", err);
    }
    this.activepage = null;

    logger.log(`App::closepage - active page closed`);
  }

  onhashchange() {
    const hash = window.location.hash;
    let pagename = hash.substring(1);
    const query_index = pagename.indexOf("?");
    if (query_index >= 0) {
      pagename = pagename.substring(0, query_index);
    }

    this.closepage();
    this.openpage(pagename);
  }

  splashscreen(visible) {
    const el1 = document.getElementById("splashscreen");
    const el2 = document.getElementById("splashscreen_loading");
    el1.classList[visible ? "add" : "remove"]("active");
    el2.classList[!visible ? "add" : "remove"]("hidden");
  }

  fullscreen(enabled, element = document) {
		if (config.enable_fullscreen !== true) {
			return;
		}

		if (this.DEBUG) {
			logger.log("fullscreen requested. Ignored in DEBUG mode");
			return;
		}

    if (!enabled) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        /* IE11 */
        document.msExitFullscreen();
      }
    } else {
			window.scrollTo(0, 1);
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        /* Safari */
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        /* IE11 */
        element.msRequestFullscreen();
      }
    }
  }

  /**
   * @returns {App} .
   */
  static get instance() {
    if (!App._instance) {
      App._instance = new App();
    }

    return App._instance;
  }
}

export default App;
