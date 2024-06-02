 /** @namespace Render */

import * as THREE from "three";
import Loader from "./loader.js";
import CameraTopdown from "./camera_topdown.js";
import PawnTankA from "./pawn_tank_a.js";
import { clamp } from "./math.js";
import Render from "./render.js";

import { InputAction } from "./inputs.js";

import { CSM } from 'three/addons/csm/CSM.js';

/**
 * basic threejs stage
 *
 * @class Playspace
 * @memberof Render 
 */
class Playspace {
  constructor() {
    /** @type {THREE.Scene} */
    this._scene = null;
    /** @type {THREE.Mesh} */
    this.cube = null;
    /** @type {THREE.Mesh} */
    this.plane = null;
    /** @type {CameraTopdown} */
    this.camera_controller = null;
    /** @type {PawnTankA} */
    this.pawn_controller = null;

		this.lights = {
			/** @type {THREE.DirectionalLight} */
			directional: null,
			/** @type {THREE.AmbientLight} */
			ambient: null,
			/** @type {THREE.HemisphereLight} */
			hemisphere: null
		};
  }

  /**
   * @param {THREE.Scene} scene .
   */
  init(scene) {
    this._scene = scene;
    this.camera_controller = new CameraTopdown();
    this.pawn_controller = new PawnTankA();

    return this;
  }

	/**
	 * @param {Render} render .
	 */
  run(render) {
		// fog
		//this._scene.fog = new THREE.Fog( 0x66c4c4, 10, 150 );
		this._scene.background = new THREE.Color(0x66c0dc);

		// lights
		{
			const ambient = new THREE.AmbientLight( 0x404040, 1 ); 
			this._scene.add( ambient );
			const directional = new THREE.DirectionalLight( 0xffffff, 2 );
			directional.position.set(10, 50, 100);
			this._scene.add( directional );
			const hemisphere = new THREE.HemisphereLight( 0xffffbb, 0xffffbb, 2 );
			this._scene.add( hemisphere );


			this.lights.directional = directional;
			this.lights.ambient = ambient;
			this.lights.hemisphere = hemisphere;

			this._run_csm(render.camera);

			/*
			directional.castShadow = true;
			directional.shadow.mapSize.width = 256;
			directional.shadow.mapSize.height = 256;
			directional.shadow.camera.left = -32;
			directional.shadow.camera.bottom = -32;
			directional.shadow.camera.right = 32;
			directional.shadow.camera.top = 32;
			directional.shadow.camera.far = 10000;
			*/
		}

		// floor
    {
			const repeats = 64;
      const geometry = new THREE.PlaneGeometry(repeats*8, repeats*8);
      const texture = Loader.instance.get_texture("tex0.png");
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.repeat.set( repeats, repeats );
      const material = new THREE.MeshToonMaterial({
        map: texture,
      });
      const plane = new THREE.Mesh(geometry, material);
			plane.position.z -= 2;
			plane.receiveShadow = true;
      this._scene.add(plane);
      this.plane = plane;
    }

		// scene
		{
			Loader.instance.get_gltf("scene.glb").then((gltf) => {
				console.log(gltf);
				/** @type {THREE.Object3D} */
				const scene = gltf.scene;
				scene.traverse((o) => {
					/** @type {THREE.Mesh} */
					const m = /** @type {any} */ (o);
					if (!m.isMesh) {
						return;
					}
					m.castShadow = true;
					m.receiveShadow = true;
					/** @type {THREE.MeshStandardMaterial} */
					const material = /** @type {any} */ (m.material);
					material.metalness = 0;

					this.csm?.setupMaterial(material);
				});

				this._scene.add(scene);

				const pawn = scene.getObjectByName("Tank_blue");

				this.camera_controller.set_target(pawn);
				this.pawn_controller.set_target(pawn);
			});
		}

		this.camera_controller.set_camera(render.camera);
		this.pawn_controller.set_camera(render.camera);

    return this;
  }

	_run_csm(camera) {
		const lightDirection = this.lights.directional.position.clone().normalize().negate();
		this.csm = new CSM( {
			maxFar: 1000,
			cascades: 4,
			mode: 'practical',
			parent: this._scene,
			shadowMapSize: 1024,
			lightDirection,
			camera
		} );
		console.log(this.csm);
	}


  step(dt) {
    this.camera_controller.step(dt);
    this.pawn_controller.step(dt);
		this.csm?.update();
  }

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input(action, start) {
		this.pawn_controller.input(action, start);
		const d = this.pawn_controller.direction;
		this.camera_controller.direction.set(d.x, d.y);
	}

	input_analog(x, y) {
		this.pawn_controller.input_analog(clamp(-1, 1, x), clamp(-1, 1, y));
		const d = this.pawn_controller.direction;
		this.camera_controller.direction.set(d.x, d.y);
	}


  stop() {
    this.cube?.removeFromParent();
    this.cube = null;
    this.plane?.removeFromParent();
    this.plane = null;
		this._scene.fog = null;
		this._scene.background = null;

		for(const k in this.lights) {
			this.lights[k].removeFromParent();
			this.lights[k] = null;
		}
  }

  dispose() {
    this.stop();
    this._scene = null;
    this.camera_controller?.cleanup();
    this.camera_controller = null;
    this.pawn_controller?.cleanup();
    this.pawn_controller = null;
  }
}

export default Playspace;
