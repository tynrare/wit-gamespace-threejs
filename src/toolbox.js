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
  const camera_conf = app.playspace.camera_controller.config;
  const pawn_conf = app.playspace.pawn_controller.config;
  const render_conf = app.render.config;

  const fapp = gui.addFolder("app");

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
	
  const fcamera = gui.addFolder("camera");
	fcamera.add(camera_conf, "distance", 1, 100);
	fcamera.add(camera_conf, "height", 1, 100);
	fcamera.add(camera_conf, "rotation", 0, Math.PI * 2);
	fcamera.add(camera_conf, "follow_speed", 1e-4, 1);
	fcamera.add(camera_conf, "camera_speed", 1e-4, 1);

  const fpawn = gui.addFolder("pawn");
	fpawn.add(pawn_conf, "movement_speed", 1e-4, 10);
	fpawn.add(pawn_conf, "rotation_speed", 1e-4, 1);

	{

		const scenes = {
			a: () => {
				app.playspace.open_playscene("a");
			},
			b: () => {
				app.playspace.open_playscene("b");
			}
		}

		const fscenes = gui.addFolder("scenes");
		fscenes.add(scenes, "a");
		fscenes.add(scenes, "b");

	}


	{
		const scenes = [];
		const tests = {
			cleanup: () => {
				while(scenes.length){
					const s = scenes.pop();
					s.removeFromParent();
				}
			},
			spawn_scene_small_a: async () => {
				const scene = await app.playspace.add_gltf("tests/city.glb");
				camera_conf.distance = 100;
				camera_conf.height = 100;
				scene.rotation.x = Math.PI / 2;
				scenes.push(scene);
			},
			spawn_scene_small_b: async () => {
				const scene = await app.playspace.add_gltf("tests/postwar_city_-_exterior_scene.glb");
				camera_conf.distance = 100;
				camera_conf.height = 100;
				scene.rotation.x = Math.PI / 2;
				scenes.push(scene);
			},
			spawn_scene_small_c: async () => {
				const scene = await app.playspace.add_gltf("tests/stylized_moba_fountain_base.glb");
				camera_conf.distance = 100;
				camera_conf.height = 100;
				scene.rotation.x = Math.PI / 2;
				scene.scale.set(0.05, 0.05, 0.05);
				scenes.push(scene);
			}
		}

		const ftests = gui.addFolder("tests");
		ftests.add(tests, "cleanup");
		ftests.add(tests, "spawn_scene_small_a");
		ftests.add(tests, "spawn_scene_small_b");
		ftests.add(tests, "spawn_scene_small_c");
	}
}

export { run_toolbox };
