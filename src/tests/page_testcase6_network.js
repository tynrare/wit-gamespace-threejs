/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { createFloorPlane } from "./utils.js";
import { MESSAGE_GAME_ACTION_TYPE, Network } from "../network.js";
import Stats from "../stats.js";
import PawnMap from "../pawn/pawn_map.js";
import { InputsMap, InputAction } from "../pawn/inputs_map.js";
import { Vec3Up, cache } from "../math.js";
import alea from "../lib/alea.js";

class CharacterDrawTestcase6Network {
  constructor() {
    /** @type {THREE.Sprite} */
    this.sprite = null;
    /** @type {THREE.Texture} */
    this.texture = null;
    /** @type {PawnMap} */
    this._pawn = null;

    this.frame = 0;
    this.frame_elapsed = 0;
    this.frame_time = 80;

    this.spritesheet_w = 6;
    this.spritesheet_h = 7;

    this.animations = {
      idle: {
        start_x: 0,
        start_y: 0,
        length: 5,
      },
      run: {
        start_x: 0,
        start_y: 1,
        length: 5,
      },
    };

    this.animation = "idle";
  }

  run(index, pawn) {
    this._pawn = pawn;

    this.texture = Loader.instance.get_texture(
      `sprites/char-${index}.png`,
      true,
      true,
    );
    this.texture.repeat.set(1 / this.spritesheet_w, 1 / this.spritesheet_h);

    // plane mode
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      alphaTest: 0.5,
    });
    const geometry = new THREE.PlaneGeometry();
    const plane = new THREE.Mesh(geometry, material);
    this.sprite = plane;
    this.sprite.castShadow = true;

    // sprite mode
    //const material = new THREE.SpriteMaterial({ map: this.texture });
    //this.sprite = new THREE.Sprite(material);
  }

  step(dt) {
    if (!this.texture.source.dataReady) {
      return;
    }
    this.frame_elapsed += dt;
    if (this.frame_elapsed >= this.frame_time) {
      this.frame_elapsed -= this.frame_time;
      this.update_frame();
    }

		const pawnpos = cache.vec3.v0.copy(this._pawn.get_pos());
		pawnpos.y += 0.4;
		this.sprite.position.lerp(pawnpos, 0.5);
    this.animation = this._pawn.moving ? "run" : "idle";

    const camera = App.instance.render.camera;
    const pawndir = cache.vec3.v0.copy(this._pawn.path_direction);
    const cameradir = camera.getWorldDirection(cache.vec3.v1);
    const cameraangle = Math.atan2(cameradir.x, -cameradir.z);
    pawndir.applyAxisAngle(Vec3Up, cameraangle);
    const scalex = pawndir.x > 0 ? 1 : -1;
    this.sprite.scale.x = scalex;

    //this.sprite.lookAt(camera.position.x, camera.position.y, camera.position.z);
    this.sprite.rotation.y = -cameraangle;
    //sprite mode
    //this.texture.repeat.x = scalex / this.spritesheet_w;
  }

  update_frame() {
    const animation = this.animations[this.animation];
    this.frame = (this.frame + 1) % animation.length;

    let column = (animation.start_x + this.frame) % this.spritesheet_w;
    this.texture.offset.x = column / this.spritesheet_w;

    let row =
      animation.start_y +
      Math.floor((animation.start_x + this.frame) / this.spritesheet_w);

    this.texture.offset.y = this.spritesheet_h - (row + 1) / this.spritesheet_h;
  }
}

class LevelTestcase6Network {
  constructor() {
    /** @type {PawnMap} */
    this.pawn_local = null;

    /** @type {Object<string, PawnMap>} */
    this.pawns = {};

    /** @type {Object<string, CharacterDrawTestcase6Network>} */
    this.characters_draw = {};
  }

  step(dt) {
    for (const k in this.pawns) {
      const p = this.pawns[k];
      const c = this.characters_draw[k];
      p.step(dt);
      c.step(dt);
    }
  }

  run() {}

  create_pawn(id, local) {
    const pawn = new PawnMap();
    this.pawns[id] = pawn;
    if (local) {
      this.pawn_local = pawn;
    }

    const character_draw = new CharacterDrawTestcase6Network();
    this.characters_draw[id] = character_draw;
    const rand = alea(id);
    character_draw.run(rand.range(0, 6), pawn);
    character_draw.frame_elapsed += rand.range(1000); // outsync animations

    App.instance.render.scene.add(character_draw.sprite);
  }

  remove_pawn(id) {
    const character = this.characters_draw[id];
    character.sprite.removeFromParent();
    delete this.characters_draw[id];
    delete this.pawns[id];
  }

  stop() {
    for (const k in this.pawns) {
      this.remove_pawn(k);
    }
    this.pawn_local = null;
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
    if (this.level.pawn_local) {
      this.level.pawn_local.set_goal(this.input_goal);
      this.input_goal_dbg_a.position.copy(this.level.pawn_local.path_a);
      this.input_goal_dbg_b.position.copy(this.level.pawn_local.path_b);
    }

    this.network.send_game_action_pos(
      MESSAGE_GAME_ACTION_TYPE.POSITION,
      x,
      0,
      z,
    );
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.controls.update();

    if (this.level.pawn_local) {
      this.input_goal_dbg_c.position.copy(this.level.pawn_local.get_pos());
    }

    this.precess_network_queries();

    this.level.step(dt);
  }

  precess_network_queries() {
    for (const k in this.network.players) {
      const player = this.network.players[k];
      const pawn = this.level.pawns[k];
      const character_draw = this.level.characters_draw[k];
      if (!pawn) {
        continue;
      }
      while (player.query.length) {
        const packet = player.query.shift();
        const pos = cache.vec3.v0;
        pos.set(packet.pos[0], packet.pos[1], packet.pos[2]);
        switch (packet.subtype) {
          case MESSAGE_GAME_ACTION_TYPE.POSITION:
            pawn.set_goal(pos);
            pawn.path_timestamp -= packet.latency; // ?
            break;
          case MESSAGE_GAME_ACTION_TYPE.POSITION_FORCED:
            pawn.path_a.copy(pos);
            pawn.path_b.copy(pos);
            pawn.path_timestamp -= packet.latency; // ?
						character_draw.sprite.position.copy(pos);
            break;
        }
      }
    }
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
    controls.maxPolarAngle = Math.PI * 0.45;
    controls.minPolarAngle = Math.PI * 0.3;

    this.inputs = new InputsMap(
      inputs_el,
      App.instance.render,
      this.input.bind(this),
      this.input_analog.bind(this),
    );
    this.inputs.run();

    this.input_goal_dbg_a = render.utils.spawn_icosphere0(0xff0000, 0.04);
    this.input_goal_dbg_b = render.utils.spawn_icosphere0(0x00ff00, 0.04);
    this.input_goal_dbg_c = render.utils.spawn_icosphere0(0x0000ff, 0.04);
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

		this.process_network_players();
  }

  process_network_players() {
		// disoneccted players
		for(const k in this.level.pawns) {
      if (!this.network.players[k]) {
				this.level.remove_pawn(k);
			}
		}

		// connected players
    for (const k in this.network.players) {
      const p = this.network.players[k];
      if (!this.level.pawns[k]) {
        this.level.create_pawn(k, p.local);

        const pawnpos = this.level.pawn_local.get_pos();
        const pawnpos_b = this.level.pawn_local.path_b;
        this.network.send_game_action_pos(
          MESSAGE_GAME_ACTION_TYPE.POSITION_FORCED,
          pawnpos_b.x,
          pawnpos_b.y,
          pawnpos_b.z,
        );
        this.network.send_game_action_pos(
          MESSAGE_GAME_ACTION_TYPE.POSITION,
          pawnpos.x,
          pawnpos.y,
          pawnpos.z,
        );
      }
    }
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
