 /** @namespace Render */

import * as THREE from "three";
import Loader from "./loader.js";
import CameraThirdPerson from "./camera_third_person.js";
import PawnThirdPerson from "./pawn_third_person.js";
import { clamp } from "./math.js";

import { InputAction } from "./inputs.js";

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
    /** @type {CameraThirdPerson} */
    this.camera_controller = null;
    /** @type {PawnThirdPerson} */
    this.pawn_controller = null;

		this.lights = {};
  }

  /**
   * @param {THREE.Scene} scene .
   */
  init(scene) {
    this._scene = scene;
    this.camera_controller = new CameraThirdPerson();
    this.pawn_controller = new PawnThirdPerson();

    return this;
  }

  run() {
		// fog
		//this._scene.fog = new THREE.Fog( 0x66c4c4, 10, 150 );
		this._scene.background = new THREE.Color(0x66c0dc);

		// lights
		{
			const ambient = new THREE.AmbientLight( 0x404040, 1 ); 
			this._scene.add( ambient );
			const directional= new THREE.DirectionalLight( 0xffffff, 2 );
			directional.position.set(100, 100, 100);
			this._scene.add( directional );
			const hemisphere = new THREE.HemisphereLight( 0xffffbb, 0xffffbb, 2 );
			this._scene.add( hemisphere );

			directional.castShadow = true;
			directional.shadow.mapSize.width = 4096;
			directional.shadow.mapSize.height = 4096;
			directional.shadow.camera.left = -64;
			directional.shadow.camera.bottom = -64;
			directional.shadow.camera.right = 64;
			directional.shadow.camera.top = 64;
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

		// character
    {
      const geometry = new THREE.BoxGeometry(1, 1, 2);
      const material = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
      const cube = new THREE.Mesh(geometry, material);
      this._scene.add(cube);
      this.cube = cube;
			this.cube.position.z += 1;
			cube.castShadow = true;
			cube.receiveShadow = true;
    }
		// character "eyes"
		{
      const geometry = new THREE.BoxGeometry(0.6, 0.1, 0.1);
      const material = new THREE.MeshToonMaterial({ color: 0x777777 });
      const cube = new THREE.Mesh(geometry, material);
      this.cube.add(cube);
			cube.position.y += 0.5;
			cube.position.z += 0.5;
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
				});

				scene.position.y -= 100;

				this._scene.add(scene);

				const pawn = scene.getObjectByName("Tank_blue");
				scene.position.y -= 100;

				this.camera_controller.set_target(pawn);
				this.pawn_controller.set_target(pawn);
			});
		}


    return this;
  }

  step(dt) {
    this.camera_controller.step(dt);
    this.pawn_controller.step(dt);
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
