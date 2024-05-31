/** @namespace Core */

import App from "./app.js";
import GUI from "lil-gui";
import { AppConfig } from "./config.js";

/**
 * draw control panel
 *
 * @param {App} app .
 * @memberof Core
 */
function run_toolbox(app) {
  const gui = new GUI();
  gui.close();
  gui.domElement.style.top = "15px";

  const fapp = gui.addFolder("app");
}

export { run_toolbox };
