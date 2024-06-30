/** @namespace Core */

import * as THREE from "three";
import App from "./app.js";
import GUI from "lil-gui";
import { AppConfig } from "./config.js";
import Loader from "./loader.js";

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
  const render_conf = app.render.config;

  const fapp = gui.addFolder("app");
	fapp.add(app, "framelimit", 2, 100);

  const frender = gui.addFolder("render");
	frender.add(render_conf, "camera_fov", 10, 100).onChange((v) => {
		app.render.set_camera_aspect();
	});

	const flights = frender.addFolder("lights");
	flights.add(render_conf, "lightmaps_intensity", 0, 10).onChange((v) => {
		app.playspace._scene.traverse((o) => {
			/** @type {THREE.Mesh} */
			const m = /** @type {any} */ (o);
			if (!m.material) {
				return;
			}
			/** @type {THREE.MeshStandardMaterial} */
			const material = /** @type {any} */ (m.material);
			if (!material.lightMap) {
				return;
			}
			material.lightMapIntensity = v;
		});
	});
	flights.add(render_conf, "lights").onChange((v) => {
		app.playspace.lights.enable(v);
	});
	flights.add(app.playspace.lights.lights.ambient, "intensity", 0, 10).name("ambient");
	flights.add(app.playspace.lights.lights.directional, "intensity", 0, 10).name("directional");
	flights.add(app.playspace.lights.lights.hemisphere, "intensity", 0, 10).name("hemisphere");
	//frender.add(render_conf, "shadows")

	{

		const scenes = {
			a: () => {
				app.playspace.open_playscene("a");
			},
			b: () => {
				app.playspace.open_playscene("b");
			},
			c0: () => {
				app.playspace.open_playscene("c0");
			},
			c1: () => {
				app.playspace.open_playscene("c1");
			},
		}

		const fscenes = gui.addFolder("scenes");
		fscenes.add(scenes, "a");
		fscenes.add(scenes, "b");
		fscenes.add(scenes, "c0");
		fscenes.add(scenes, "c1");

	}
}

export { run_toolbox };
