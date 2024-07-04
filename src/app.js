/** @namespace Core */

import PageBase from "./page_base.js";
import PageMainmenu from "./page_mainmenu.js";
import PageTestcase1 from "./tests/page_testcase1.js";
import logger from "./logger.js";
import Render from "./render.js";
import Stats from "./stats.js";
import Loop from "./loop.js";

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
    /** @type {PageBase} */
    this.activepage = null;
    /** @type {Object<string, PageBase>} */
    this.pages = {
      mainmenu: new PageMainmenu(),
      testcase1: new PageTestcase1(),
    };

    /** @type {Render} */
    this.render = null;

    /** @type {Loop} */
    this.loop = null;

    /** @type {HTMLElement} */
    this.container = null;
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

  /**
   * starts loop
   * @param {HTMLElement} container .
   */
  start(container) {
    this.render.run(container);
    this.loop.start();
  }

  /**
   * pauses loop
   */
  pause() {
    this.render.stop();
    this.loop.pause();
  }

  /**
   * @param {HTMLElement} container .
   */
  init(container) {
    this.container = container;
    this.render = new Render().init();
    this.loop = new Loop().run();
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
  }

  run() {
    if (!window.location.hash) {
      window.location.hash = this.config.base_location;
    }

    this.onhashchange();

    this._hashchange_listener = this.onhashchange.bind(this);
    window.addEventListener("hashchange", this._hashchange_listener);

    return this;
  }

  stop() {
    window.removeEventListener("hashchange", this._hashchange_listener);
    this._hashchange_listener = null;

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
