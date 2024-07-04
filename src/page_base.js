/** @namespace Pages */

/**
 * @class PageBase
 * @memberof Pages
 */
class PageBase {
  constructor() {
    /** @type {HTMLElement} */
    this.container = null;
  }

  /**
   * @param {HTMLElement} container .
   */
  init(container) {
    this.container = container;

    return this;
  }
  dispose() {
    this.container = null;
  }
  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {}
  /**
   * @virtual
   */
  run() {}
  /**
   * @virtual
   */
  stop() {}
}

export default PageBase;
