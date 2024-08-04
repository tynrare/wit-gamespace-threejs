/** @namespace Pages/Tests */

import * as THREE from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import LightsA from "../lights_a.js";
import { MapControls } from "three/addons/controls/MapControls.js";
import { createFloorPlane } from "./utils.js";
import {
  MESSAGE_TYPE,
  MESSAGE_GAME_ACTION_TYPE,
  Network,
  NetPacket,
  NET_PACKET_SIZE,
} from "../network.js";
import Stats from "../stats.js";
import PawnMap from "../pawn/pawn_map.js";
import { InputsMap, InputAction } from "../pawn/inputs_map.js";
import { cache } from "../math.js";
import alea from "../lib/alea.js";
import logger from "../logger.js";
import { Pool, Entity } from "../entity.js";
import {
  ENTITY_SPRITESHEET_TYPE,
  SpritesheetAnimationSource,
  SpriteAnimated,
  EntitySprite,
} from "./sprite.js";

class LevelTestcase6Network {
  /**
   * @param {Pool} pool .
   */
  constructor(pool) {
    this.seed_static = 0;
    this.seed = 0;
    this._pool = pool;

    /** @type {Object<number, EntitySprite>} */
    this.entities = {};
  }

  step(dt) {
    for (const k in this.entities) {
      const e = this.entities[k];
      e.step(dt);
    }
  }

  /**
   * @param {boolean} create new world flag
   * @param {string|number} seed .
   */
  run(create, seed) {
    const rand = alea("" + seed);
    this.seed = rand.range(0x1000);

    if (create) {
      logger.log("New world! Generating...");
      this._generate_world();
    }
  }

  _generate_world() {
    const rand = alea("" + this.seed + this.seed_static);
    const iterations = 7;

    const generate_island = (origin, size) => {
      for (let i = 0; i < iterations; i++) {
        const pos = cache.vec3.v1;
        pos
          .set(rand.range(-1.1, 1.1), 0, rand.range(-1.1, 1.1))
          .normalize()
          .multiplyScalar(rand.range(-size - 0.1, size + 0.1))
          .add(origin);

        this.make_entity(pos, ENTITY_SPRITESHEET_TYPE.PROP);
      }
    };

    for (let i = 0; i < iterations; i++) {
      const origin = cache.vec3.v0;
      origin
        .set(rand.range(-1.1, 1.1), 0, rand.range(-1.1, 1.1))
        .normalize()
        .multiplyScalar(rand.range(-10.1, 10.1));

      const entity = this.make_entity(origin, ENTITY_SPRITESHEET_TYPE.GRASS);
      entity.draw.sprite.receiveShadow = true;
      entity.pickable = false;
      generate_island(origin, 2);
    }
  }

  /**
   * @param {Entity} entity_data .
   */
  add_entity(entity_data) {
    const entity = new EntitySprite(entity_data);
    entity.init().run();
    this.entities[entity.id] = entity;

    return entity;
  }

  make_entity(pos, type) {
    const e = this._pool.allocate();
    const seed = this.seed + this.seed_static + e.id;
    e.type = type;
    e.seed = seed;
    const entity = this.add_entity(e);
    entity.teleport(pos);

    logger.log(
      `Created entity #${entity.id} at ${pos.x.toFixed(2)},${pos.z.toFixed(2)}, type ${type}`,
    );

    return entity;
  }

  /**
   * Only removes entity from view, not data
   */
  dispose_entity(id) {
    const entity = this.entities[id];
    if (!entity) {
      logger.warn(`Attempted to dispose entity ${id} which does not exist`);
      return;
    }
    delete this.entities[id];
    entity.dispose();
  }

  /**
   * @returns {EntitySprite?}
   */
  pick(x, y, z, max_dist = 0.5) {
    const entitypos = cache.vec3.v0;
    const pickpos = cache.vec3.v1.set(x, y, z);
    let closest_dist = max_dist;
    /** @type {EntitySprite} */
    let closest_entity = null;

    for (const k in this.entities) {
      const e = this.entities[k];
      if (!e.pickable) {
        continue;
      }
      const pawn = e.pawn;
      e.pawn.get_pos(entitypos);
      const dist = entitypos.distanceTo(pickpos);
      if (closest_dist > dist) {
        closest_dist = dist;
        closest_entity = e;
      }
    }

    return closest_entity;
  }

  stop() {
    for (const k in this.entities) {
      this.dispose_entity(k);
    }
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

    this.lobby_loaded = false;

    /** @type {PawnMap?} */
    this.pawn_local = null;

    /** @type {string?} */
    this.entity_picked = null;
    this.gather_delay = -1;

    /** @type {Object<string, PawnMap>} */
    this.pawns = {};

    /** @type {THREE.Object3D} */
    this.input_goal_dbg_a = null;
    this.input_goal_dbg_b = null;
    this.input_goal_dbg_c = null;

    this.config = {
      routine_dt: 700,
    };

    this.routine_elapsed = 0;
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
      this.entity_picked = null;
      const picked = this.level.pick(x, 0, z);
      const goal = cache.vec3.v0.set(x, 0, z);
      if (picked) {
        const picked_pos = picked.pawn.get_pos(cache.vec3.v1);
        const dir = cache.vec3.v2.copy(this.pawn_local.get_pos(cache.vec3.v3));
        dir.sub(picked_pos).normalize().multiplyScalar(0.3);

        goal.copy(picked_pos.add(dir));

        this.entity_picked = picked.id;
      }
      this.set_goal(goal.x, goal.z);
    } else if (action === InputAction.action_b) {
      // click-hold
    } else if (action === InputAction.action_c) {
      // pointer-move
    } else if (action === InputAction.action_d) {
      // click-hold delta
    }
  }

  set_goal(x, z) {
    this.input_goal.set(x, 0, z);
    if (this.pawn_local) {
      this.pawn_local.set_goal(this.input_goal);
      this.input_goal_dbg_a?.position.copy(this.pawn_local.path_a);
      this.input_goal_dbg_b?.position.copy(this.pawn_local.path_b);
    }

    this.network.send_game_action_pos(
      MESSAGE_GAME_ACTION_TYPE.POSITION,
      x,
      0,
      z,
    );
  }

  /**
   * @param {number} dt .
   */
  step(dt) {
    this.controls.update();

    if (this.pawn_local) {
      this.input_goal_dbg_c?.position.copy(this.pawn_local.get_pos());
    }

    this.level.step(dt);
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
      const plane = createFloorPlane(1, true);
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

    if (App.instance.DEBUG) {
      this.input_goal_dbg_a = render.utils.spawn_icosphere0(0xff0000, 0.04);
      this.input_goal_dbg_b = render.utils.spawn_icosphere0(0x00ff00, 0.04);
      this.input_goal_dbg_c = render.utils.spawn_icosphere0(0x0000ff, 0.04);
      scene.add(
        this.input_goal_dbg_a,
        this.input_goal_dbg_b,
        this.input_goal_dbg_c,
      );
    }

    this.network = new Network("0cedcf29-999d-4d80-864a-a38caa98182e")
      .init()
      .run();

    this.level = new LevelTestcase6Network(this.network.pool);
  }

  make_player_stats_pics(player) {
    let pics = "";
    if (!this.network.get_blame_mask(player)) {
      pics += "👑";
    }

    if (!player.local) {
			/*
      if (blamed) {
        pics += ""; // player blames this client wich has desync
      }
			*/
    }

		// other client blames this client
    if (this.network.has_blames(this.network.playerlocal, player)) {
      pics += "😡";
    }

		// client blamed by someone
    if (this.network.has_blames(player)) {
      pics += "😓";
    }

    return pics.padStart(6, "🟢");
  }

  routine() {
    if (App.instance.DEBUG) {
      let msg = "<d>Network:</d>";
      for (const k in this.network.players) {
        const stamp = this.network.playerlocal.stamp;
        const p = this.network.players[k];
        const stampdelta = p.stamp - stamp;
        const stampdelta_sa = Math.abs(stampdelta).toString().padStart(4, "0");
        const stampdelta_s = `${stampdelta >= 0 ? "+" : "-"}${stampdelta_sa}`;
        const pics = this.make_player_stats_pics(p);

        msg += `<d>${pics} | ${stampdelta_s} ${p.tostring()}</d>`;
      }
      Stats.instance.print(msg);
    } else {
      Stats.instance.print("");
    }

    if (!this.lobby_loaded && this.network.netlib?.currentLobby) {
      this.lobby_loaded = true;
      this.level.run(
        this.network.playerlocal.creator,
        this.network.netlib.currentLobby,
      );
    }

    // remove entities
    for (const k in this.level.entities) {
      const entity = this.level.entities[k];
      if (!this.network.pool.entities[k]) {
        this.level.dispose_entity(k);
      }
    }

    // add entities
    for (const k in this.network.pool.entities) {
      const e = this.network.pool.entities[k];
      if (!this.level.entities[k]) {
        const entity = this.level.add_entity(e);
        const p = entity.pawn.get_pos(cache.vec3.v0);
        entity.teleport(p);
      }
    }

    //this.process_network_players();
  }

  process_network_players() {
    // disoneccted players
    for (const k in this.pawns) {
      if (!this.network.players[k]) {
        this.remove_pawn(k);
      }
    }

    // connected players
    for (const k in this.network.players) {
      const p = this.network.players[k];
      if (!this.pawns[k]) {
        const entity = this.create_pawn(k, p.local);

        const draw = entity.draw;

        const pawnpos = this.pawn_local.get_pos();
        const pawnpos_b = this.pawn_local.path_b;
        this.network.send_game_action_pos(
          MESSAGE_GAME_ACTION_TYPE.POSITION,
          pawnpos.x,
          pawnpos.y,
          pawnpos.z,
          p.id,
        );
      }
    }
  }

  create_pawn(id, local) {
    // pawns is LOCAL entity. It doesn't listed in sync list
    // It should be.
    const entity = this.level.make_entity(
      cache.vec3.v0.set(0, 0, 0),
      ENTITY_SPRITESHEET_TYPE.CHARACTER,
    );
    const pawn = entity.pawn;
    entity.pickable = false;

    this.pawns[id] = pawn;
    if (local) {
      this.pawn_local = pawn;
    }

    return entity;
  }

  remove_pawn(id) {
    if (this.pawn_local.id == id) {
      this.pawn_local = null;
    }
    delete this.pawns[id];
    this.level.dispose_entity(id);
  }

  stop() {
    for (const k in this.pawns) {
      this.remove_pawn(k);
    }
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
