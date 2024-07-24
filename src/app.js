/** @namespace Core */

import PageBase from "./page_base.js";
import PageMainmenu from "./page_mainmenu.js";
import PageSettings from "./page_settings.js";
import PageSplashscreenBowling from "./scenes/page_splashscreen_bownling.js";
import PageMinigameA from "./scenes/page_minigame_a.js";

import PageTestcase1 from "./tests/page_testcase1.js";
import PageTestcase2Tanks from "./tests/page_testcase2_tanks.js";
import PageTestcase3 from "./tests/page_testcase3.js";
import PageTestcase4 from "./tests/page_testcase4.js";
import AaPageTestcaseBowling from "./tests/deprecated/aa_page_tc_bowling.js";
import AbPageTestcaseBowling from "./tests/deprecated/ab_page_tc_bowling.js";
import AcPageTestcaseBowling from "./tests/deprecated/ac_page_tc_bowling.js";
import AdPageTestcaseBowling from "./tests/ad_page_tc_bowling.js";
import AePageTestcaseBowling from "./tests/ae_page_tc_bowling.js";
import AePageTestcaseTank from "./tests/ae_page_tc_tank.js";
import AfPageTestcaseBoulder from "./tests/af_page_tc_boulder.js";
import BaPageTestcaseVehicle from "./tests/ba_page_tc_vehicle.js";

import logger from "./logger.js";
import Render from "./render.js";
import Stats from "./stats.js";
import Loop from "./loop.js";
import Session from "./session.js";
import Settings from "./settings.js";
import Scoreboard from "./scoreboard.js";

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
			minigame_a: new PageMinigameA(),

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
		const mode = urlParams.get('mode');
		if (mode !== "prod") {
			document.getElementById("stats").classList.remove("hidden");
		}

    const server_url = urlParams.get('server');
		Scoreboard.instance.init(server_url);

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

    logger.log(`App::openpage - page ${name} opened`);
  }

  closepage() {
    if (!this.activepage) {
      return;
    }

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
			window.location.hash = "#" + pagename;
			return;
		}

    this.closepage();
    this.openpage(pagename);
  }

  spashscreen(visible) {
    const el1 = document.getElementById("splashscreen");
    const el2 = document.getElementById("splashscreen_loading");
    el1.classList[visible ? "add" : "remove"]("active");
    el2.classList[!visible ? "add" : "remove"]("hidden");
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
