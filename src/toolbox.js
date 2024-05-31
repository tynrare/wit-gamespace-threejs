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

	const app_conf = AppConfig.instance;
  const camera_conf = app.playspace.camera_controller.config;
  const pawn_conf = app.playspace.pawn_controller.config;

  const fapp = gui.addFolder("app");

  const fcamera = gui.addFolder("camera");
	fcamera.add(camera_conf, "distance", 1, 100);
	fcamera.add(camera_conf, "height", 1, 100);
	fcamera.add(camera_conf, "rotation", 0, Math.PI * 2);
	fcamera.add(camera_conf, "follow_speed", 1e-4, 1);
	fcamera.add(camera_conf, "camera_speed", 1e-4, 1);

  const fpawn = gui.addFolder("pawn");
	fpawn.add(pawn_conf, "movement_speed", 1e-4, 10);
	fpawn.add(pawn_conf, "rotation_speed", 1e-4, 1);
}

export { run_toolbox };
