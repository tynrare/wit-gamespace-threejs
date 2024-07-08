/** @namespace Pages/Tests */

import * as THREE from "three";
import PageBase from "../page_base.js";
import App from "../app.js";
import PlayspaceTanks from "../d240708_tanks/playspace.js";
import { InputsTanks } from "../d240708_tanks/inputs.js";

/**
 * @class PageTestcase2Tanks
 * @memberof Pages/Tests
 */
class PageTestcase2Tanks extends PageBase {
  constructor() {
    super();

    /** @type {PlayspaceTanks} */
    this.playspace = null;
    /** @type {InputsTanks} */
    this.inputs = null;
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.playspace.step(dt);
  }

  run() {
    const render_container = this.container.querySelector("render");
    App.instance.start(render_container);
    this.playspace = new PlayspaceTanks();
    this.playspace.init(App.instance.render.scene).run(App.instance.render);

    this.inputs = new InputsTanks(
      this.container,
      this.container,
      this.playspace.input.bind(this.playspace),
      this.playspace.input_analog.bind(this.playspace),
    );

    const render = App.instance.render;
    const scene = render.scene;
  }

  stop() {
    this.playspace.dispose();
    App.instance.pause();
		this.inputs.dispose();
		this.inputs = null;
		this.playspace = null;
  }
}

export default PageTestcase2Tanks;
