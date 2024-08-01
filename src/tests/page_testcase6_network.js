/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { createFloorPlane } from "./utils.js";
import Network from "../network.js";
import Stats from "../stats.js";
import PawnMap from "../pawn/pawn_map.js";
import { InputsMap, InputAction } from "../pawn/inputs_map.js";

class LevelTestcase6Network {
  constructor() {
    /** @type {PawnMap} */
    this.pawn_local = null;
    /** @type {Object<string, PawnMap>} */
    this.pawns = {};
  }

  step(dt) {
    this.pawn_local.step(dt);
  }

  run() {
    this.pawn_local = new PawnMap();
  }
}

/**
 * @class PageTestcase6Network
 * @memberof Pages/Tests
 */
class PageTestcase6Network extends PageBase {
  constructor() {
    super();

    /** @type {LightsA} */
    this.lights = null;

    /** @type {MapControls} */
    this.controls = null;

    /** @type {Network} */
    this.network = null;

    /** @type {InputsMap} */
    this.inputs = null;

    this.input_goal = new THREE.Vector3();

    /** @type {LevelTestcase6Network} */
    this.level = null;

    /** @type {THREE.Object3D} */
    this.input_goal_dbg_a = null;
    this.input_goal_dbg_b = null;
    this.input_goal_dbg_c = null;
  }

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input(action, start) {
    if (!start) {
    }
  }

  /**
   * @param {InputAction} action .
   * @param {boolean} start .
   */
  input_analog(x, z, action) {
    if (action === InputAction.action_a) {
			this.set_goal(x, z);
    } else if (action === InputAction.action_c) {
      // click-hold
    } else if (action === InputAction.action_d) {
      // click-hold delta
    }
  }

  set_goal(x, z) {
    this.input_goal.set(x, 0, z);
    this.level.pawn_local.set_goal(this.input_goal);
    this.input_goal_dbg_a.position.copy(this.level.pawn_local.path_a);
    this.input_goal_dbg_b.position.copy(this.level.pawn_local.path_b);
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.controls.update();
    this.level.step();

    this.input_goal_dbg_c.position.copy(this.level.pawn_local.get_pos());
  }

  run() {
    App.instance.start(this.container.querySelector("render"));

    const render = App.instance.render;
    const scene = render.scene;

    scene.background = new THREE.Color(0x66c0dc);
    this.lights = new LightsA().run(App.instance.render);
		this.lights.lights.directional.intensity = 1;

    // floor
    {
      const plane = createFloorPlane();
      scene.add(plane);
      this.plane = plane;
    }

    const inputs_el = this.container.querySelector("overlay.gp-inputs");
    // camera controls
    const controls = new MapControls(render.camera, inputs_el);
    controls.enableDamping = true;
    this.controls = controls;

    this.inputs = new InputsMap(
      inputs_el,
      App.instance.render,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();

    this.input_goal_dbg_a = render.utils.spawn_icosphere0(0xff0000);
    this.input_goal_dbg_b = render.utils.spawn_icosphere0(0x00ff00);
    this.input_goal_dbg_c = render.utils.spawn_icosphere0(0x0000ff);
    scene.add(
      this.input_goal_dbg_a,
      this.input_goal_dbg_b,
      this.input_goal_dbg_c,
    );

    this.level = new LevelTestcase6Network();
    this.level.run();

    this.network = new Network("0cedcf29-999d-4d80-864a-a38caa98182e")
      .init()
      .run();
  }

  routine() {
    let msg = "<d>Network:</d>";
    for (const k in this.network.players) {
      const p = this.network.players[k];
      msg += `<d>${p.tostring()}</d>`;
    }
    Stats.instance.print(msg);
  }

  stop() {
    this.lights.stop();
    this.lights = null;
    this.controls = null;
    this.network.dispose();
    this.network = null;
    Stats.instance.print("");
    App.instance.pause();
  }
}

export default PageTestcase6Network;
