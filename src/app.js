/** @namespace Core */

import PageBase from "./page_base.js";
import PageMainmenu from "./page_mainmenu.js";
import PageSettings from "./page_settings.js";
import PageTestcase1 from "./tests/page_testcase1.js";
import PageTestcase2Tanks from "./tests/page_testcase2_tanks.js";
import PageTestcase3 from "./tests/page_testcase3.js";
import PageTestcase4 from "./tests/page_testcase4.js";
import logger from "./logger.js";
import Render from "./render.js";
import Stats from "./stats.js";
import Loop from "./loop.js";
import Session from "./session.js";
import Settings from "./settings.js";

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
      testcase1: new PageTestcase1(),
      testcase2: new PageTestcase2Tanks(),
      testcase3: new PageTestcase3(),
      testcase4: new PageTestcase4(),
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
    this.render.run(container);
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

    this.onhashchange();

    this._hashchange_listener = this.onhashchange.bind(this);
    window.addEventListener("hashchange", this._hashchange_listener);

    this.routine();
    this._routine_timer_id = setInterval(this.routine.bind(this), 1000);

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

    this.activepage.stop();
    this.activepage.dispose();
    this.activepage = null;

    logger.log(`App::closepage - active page closed`);
  }

  onhashchange() {
    if (this._ignore_hashchange) {
      this._ignore_hashchange = false;
      return;
    }

    const hash = window.location.hash;
    const pagename = hash.substring(1);

    this.closepage();
    this.openpage(pagename);
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
