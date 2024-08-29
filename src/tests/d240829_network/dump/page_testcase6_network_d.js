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
import { Vec3Up, cache } from "../math.js";
import alea from "../lib/alea.js";
import logger from "../logger.js";

const CHARACTER_SPRITESHEET_TYPE = {
  NONE: 0,
  CHARACTER: 1,
  PROP: 2,
  GRASS: 3,
};

class CharacterSpritesheetTestcase6Network {
  constructor() {
    this.frame_time = 30;
    this.animations = {};
    this.width = 1;
    this.height = 1;
    this.path = "";

    this.frame_shift_y = 0;
    this.world_shift_y = 0.5;

    this.world_scale_x = 1;
    this.world_scale_y = 1;

    this.billboard = true;
    this.rotation_x = 0;

    this.type = CHARACTER_SPRITESHEET_TYPE.NONE;

    /** @type {THREE.Texture} */
    this.texture = null;
  }

  load() {
    this.texture = Loader.instance.get_texture(this.path, true, true);
    this.texture.repeat.set(1 / this.width, 1 / this.height);
  }

  get_animation(key) {
    return this.animations[key];
  }

  get_frame_time(key) {
    return this.get_animation(key)?.frame_time ?? this.frame_time;
  }

  /**
   * @param {CHARACTER_SPRITESHEET_TYPE} type .
   * @param {number} index .
   */
  set_type(type, seed) {
    const rand = alea(seed);
    switch (type) {
      case CHARACTER_SPRITESHEET_TYPE.CHARACTER:
        this.set_character(rand.range(0, 5));
        break;
      case CHARACTER_SPRITESHEET_TYPE.PROP:
        this.set_prop(rand.range(0, 3));
        break;
      case CHARACTER_SPRITESHEET_TYPE.GRASS:
        this.set_grass(0);
        break;
    }

    this.type = type;

    return this;
  }

  set_character(index) {
    this.path = `sprites/char-${index}.png`;
    this.frame_time = 80;
    this.frame_shift_y = 1; // donno know why
    this.world_shift_y = 0.4;
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
			gather: {
        start_x: 4,
        start_y: 3,
        length: 2,
				frame_time: 120,
				once: true
			}
    };

    this.width = 6;
    this.height = 7;

    return this;
  }
  set_prop(index) {
    this.path = `sprites/props-0.png`;
    this.frame_time = Infinity;
    this.width = 2;
    this.height = 2;

    const x = index % this.width;
    const y = Math.floor(index / this.width);

    this.world_scale_x = 0.5;
    this.world_scale_y = 0.5;
    this.world_shift_y = 0.25;

    this.animations = {
      idle: {
        start_x: x,
        start_y: y,
        length: 1,
      },
    };

    return this;
  }

  set_grass(index) {
    this.path = `sprites/grass.png`;
    this.frame_time = Infinity;
    this.width = 1;
    this.height = 1;
    this.world_scale_x = 4;
    this.world_scale_y = 4;
    this.world_shift_y = 0.02 + Math.random() * 0.02;

    this.billboard = false;
    this.rotation_x = -Math.PI * 0.5;

    this.animations = {
      idle: {
        start_x: 0,
        start_y: 0,
        length: 1,
      },
    };

    return this;
  }
}

class EntityDrawTestcase6Network {
  /**
   * @param {CharacterSpritesheetTestcase6Network} spritesheet set_*() and load() it first.
   */
  constructor(spritesheet) {
    this.spritesheet = spritesheet;
    /** @type {THREE.Mesh} */
    this.sprite = null;
    /** @type {PawnMap} */
    this._pawn = null;

    this.frame = 0;
    this.frame_elapsed = 0;

    this.animation = "idle";
  }

  run(pawn) {
    this._pawn = pawn;

    this.frame_elapsed += Math.random() * 1000; // Outsync animations

    // plane mode
    const material = new THREE.MeshBasicMaterial({
      map: this.spritesheet.texture,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry();
    const plane = new THREE.Mesh(geometry, material);
    this.sprite = plane;
    this.sprite.castShadow = true;
    this.sprite.scale.set(
      this.spritesheet.world_scale_x,
      this.spritesheet.world_scale_y,
      1,
    );

    this.update_frame();

    // sprite mode
    //const material = new THREE.SpriteMaterial({ map: this.spritesheet.texture });
    //this.sprite = new THREE.Sprite(material);
  }

  step(dt) {
    if (!this.spritesheet.texture.image) {
      return;
    }
    this.frame_elapsed += dt;
    const frame_time = this.spritesheet.get_frame_time(this.animation);
    if (this.frame_elapsed >= frame_time) {
      this.frame_elapsed -= frame_time;
			const animation = this.spritesheet.get_animation(this.animation);
			const change = animation.once && this.frame + 1 >= animation.length;

      this.update_frame();
			if (change) {
				this.animation = "idle";
			}
    }
		const animation = this.spritesheet.get_animation(this.animation);

    const pawnpos = cache.vec3.v0.copy(this._pawn.get_pos());
    pawnpos.y += this.spritesheet.world_shift_y;
    this.sprite.position.lerp(pawnpos, 0.5);

		if (!animation.once) {
			this.animation = this._pawn.moving ? "run" : "idle";
		}

    if (this.spritesheet.billboard) {
      const camera = App.instance.render.camera;
      const pawndir = cache.vec3.v0.copy(this._pawn.path_direction);
      const cameradir = camera.getWorldDirection(cache.vec3.v1);
      const cameraangle = Math.atan2(cameradir.x, -cameradir.z);
      pawndir.applyAxisAngle(Vec3Up, cameraangle);
      const scalex = pawndir.x > 0 ? 1 : -1;
      this.sprite.scale.x = scalex * this.spritesheet.world_scale_x;

      this.sprite.rotation.y = -cameraangle;
    }

    this.sprite.rotation.x = this.spritesheet.rotation_x;
  }

  update_frame() {
    const animation = this.spritesheet.get_animation(this.animation);
    const spritesheet_w = this.spritesheet.width;
    const spritesheet_h = this.spritesheet.height;
    this.frame = (this.frame + 1) % animation.length;

    let column = (animation.start_x + this.frame) % spritesheet_w;
    this.spritesheet.texture.offset.x = column / spritesheet_w;

    let row =
      animation.start_y +
      Math.floor((animation.start_x + this.frame) / spritesheet_w);

    this.spritesheet.texture.offset.y =
      spritesheet_h - (row + this.spritesheet.frame_shift_y) / spritesheet_h;
  }

	play(key) {
		this.animation = key;
		this.frame = 0;
	}
}

class EntityTestcase6Network {
  constructor(id, index) {
    /** @type {EntityDrawTestcase6Network} */
    this.entdraw = null;
    /** @type {PawnMap} */
    this.pawn = null;
    this.index = index;
    this.id = id;
    this.local = index === null;
		this.pickable = true;
  }

  init(spritesheet) {
    this.pawn = new PawnMap(this.id);
    const entdraw = new EntityDrawTestcase6Network(spritesheet);
    entdraw.run(this.pawn);
    this.entdraw = entdraw;

    return this;
  }

  run() {
    return this;
  }

  teleport(pos) {
    this.pawn.teleport(pos);
    this.entdraw.sprite.position.copy(pos);
    this.entdraw.sprite.position.y += this.entdraw.spritesheet.world_shift_y;
  }

  step(dt) {
    this.pawn.step(dt);
    this.entdraw.step(dt);

    // fixin threejs cloned textures bug
    if (this.entdraw.spritesheet.texture.image && !this.entdraw.sprite.parent) {
      App.instance.render.scene.add(this.entdraw.sprite);
    }
  }

  dispose() {
    this.entdraw.sprite.removeFromParent();
    this.entdraw = null;
    this.pawn = null;
  }
}

class LevelTestcase6Network {
  constructor() {
    /** @type {Object<string, EntityTestcase6Network>} */
    this.entities = {};
    /** @type {Array<number>} */
    this.aentities = [];

    this.entities_count = 0;

    this.seed_static = 0;
    this.seed = "aa";

    this.guids = 1;
  }

  step(dt) {
    for (const k in this.entities) {
      const e = this.entities[k];
      e.step(dt);
    }
  }

  run(create, seed) {
    this.entities_count = 0;

    this.seed = seed;

    if (!create) {
      return;
    }

    logger.log("New world! Generating...");
    this._generate_world(this.seed);
  }

  _generate_world() {
    const rand = alea(this.seed + this.seed_static);
    const iterations = 7;

    const make_entity = (pos, type) => {
      const id = this.guids++;

      return this.build_entity_prop(pos, id, type);
    };
    const generate_island = (origin, size) => {
      for (let i = 0; i < iterations; i++) {
        const pos = cache.vec3.v1;
        pos
          .set(rand.range(-1.1, 1.1), 0, rand.range(-1.1, 1.1))
          .normalize()
          .multiplyScalar(rand.range(-size - 0.1, size + 0.1))
          .add(origin);

        make_entity(pos, CHARACTER_SPRITESHEET_TYPE.PROP);
      }
    };

    for (let i = 0; i < iterations; i++) {
      const origin = cache.vec3.v0;
      origin
        .set(rand.range(-1.1, 1.1), 0, rand.range(-1.1, 1.1))
        .normalize()
        .multiplyScalar(rand.range(-10.1, 10.1));

      const entity = make_entity(origin, CHARACTER_SPRITESHEET_TYPE.GRASS);
      entity.entdraw.sprite.receiveShadow = true;
			entity.pickable = false;
      generate_island(origin, 2);
    }
  }

  build_entity_prop(pos, id, type, index = this.entities_count) {
    logger.log(
      `Building entity #${id} at ${pos.x.toFixed(2)},${pos.z.toFixed(2)}, type ${type}`,
    );
    const spritesheet = new CharacterSpritesheetTestcase6Network();
    spritesheet.set_type(type, this.seed + this.seed_static + id).load();

    const entity = this.create_entity(spritesheet, id, index);
    entity.teleport(pos);

    return entity;
  }

  create_entity(spritesheet, id, index = this.entities_count) {
    const entity = new EntityTestcase6Network(id, index)
      .init(spritesheet)
      .run();

    this.entities[id] = entity;
    if (!entity.local) {
      this.entities_count += 1;
      this.aentities[index] = entity.id;
    }

    return entity;
  }

  remove_entity(id) {
    const entity = this.entities[id];
    if (!entity) {
      logger.warn(`Attempted to remove entity ${id} which does not exist`);
			return;
    }
    delete this.entities[id];
    entity.dispose();

    if (entity.local) {
      return;
    }

    this.entities_count -= 1;

    const index = entity.index;
    const reordered_entity_id = this.aentities.pop();
    const reordered_entity = this.entities[reordered_entity_id];
    if (!reordered_entity) {
      return;
    }

    this.aentities[index] = reordered_entity.id;
    reordered_entity.index = index;
  }

  /**
   * @returns {EntityTestcase6Network?}
   */
  pick(x, y, z, max_dist = 0.5) {
    const entitypos = cache.vec3.v0;
    const pickpos = cache.vec3.v1.set(x, y, z);
    let closest_dist = max_dist;
    /** @type {EntityTestcase6Network} */
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
      this.remove_entity(k);
    }
  }
}

/**
 * @class PageTestcase6NetworkD240829
 * @memberof Pages/Tests
 */
class PageTestcase6NetworkD240829 extends PageBase {
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

      if (this.entity_picked && !this.pawn_local.moving) {
				const pawn_entity = this.level.entities[this.pawn_local.id];

				this.gather_delay += dt;
				if (this.gather_delay > 120) {
					this.level.remove_entity(this.entity_picked);
					this.network.send_game_action_gather(this.entity_picked);
					this.entity_picked = null;
					this.gather_delay = -1;
				} else {
					pawn_entity?.entdraw.play("gather");
				}
      }
    }

    this.level.step(dt);

    this.routine_elapsed += dt;
    if (this.routine_elapsed > this.config.routine_dt) {
      this.routine_elapsed -= this.config.routine_dt;
      this.process_network_entities_info();
    }

    this.precess_network_queries();
  }

  precess_network_queries() {
    for (const k in this.network.players) {
      const player = this.network.players[k];
      while (player.query.length) {
        const packet = player.query.shift();
        switch (packet.type) {
          case MESSAGE_TYPE.GAME:
            if (this.level.entities[k]) {
              this.process_network_packet_game(k, packet);
            }
            break;
          case MESSAGE_TYPE.ASK_ENTITIES:
            this.network.send_entities_response(
              packet.tags[0],
              this.level.aentities,
              player.id,
            );
            break;
          case MESSAGE_TYPE.ASK_ENTITY: {
            const id = packet.tags[0];
            const index = packet.tags[1];
            const entity = this.level.entities[id];
            const pos = cache.vec3.v0.set(-1, -1, -1);
            if (!entity) {
              this.network.send_entity_response(pos, 0, 0, index, player.id);
            } else {
              if (entity.index !== index) {
                logger.warn(
                  `Got index desync! entity #${entity.id} requested with index ${index}, here it has index ${entity.index}`,
                );
              }
              const p = entity.pawn.get_pos(pos);
              const type = entity.entdraw.spritesheet.type;
              this.network.send_entity_response(
                p,
                type,
                id,
                entity.index,
                player.id,
              );
            }
            break;
          }
          case MESSAGE_TYPE.RESPONSE_ENTITIES:
            for (let i = 0; i < packet.tags[1]; i++) {
              const index = packet.tags[0] + i;
              const id = packet.info[i];
              this.level.aentities[index] = id;
            }
            break;
          case MESSAGE_TYPE.RESPONSE_ENTITY: {
            const id = packet.tags[0];
						const index = packet.tags[1];
            if (id !== 0 && !this.level.entities[id]) {
              const pos = cache.vec3.v0;
              pos.set(packet.pos[0], packet.pos[1], packet.pos[2]);
              const type = packet.subtype;
              this.level.build_entity_prop(pos, id, type, index);
            } else if (id === 0) {
							this.level.aentities[index] = 0;
            }
            break;
          }
        }
      }
    }
  }

  /**
   * @param {NetPacket} packet .
   */
  process_network_packet_game(playerid, packet) {
    const entity = this.level.entities[playerid];
    if (!entity) {
      return;
    }
    const pawn = entity.pawn;
    const entdraw = entity.entdraw;
    const pos = cache.vec3.v0;
    pos.set(packet.pos[0], packet.pos[1], packet.pos[2]);
    switch (packet.subtype) {
      case MESSAGE_GAME_ACTION_TYPE.POSITION:
        pawn.set_goal(pos);
        pawn.path_timestamp -= packet.latency; // ?
        break;
      case MESSAGE_GAME_ACTION_TYPE.POSITION_FORCED:
        entity.teleport(pos);
        break;
      case MESSAGE_GAME_ACTION_TYPE.GATHER: {
        const id = packet.tags[0];
        this.level.remove_entity(id);
				entity.entdraw.play("gather");
        break;
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

    this.level = new LevelTestcase6Network();

    this.network = new Network("0cedcf29-999d-4d80-864a-a38caa98182e")
      .init()
      .run();
  }

  routine() {
    if (App.instance.DEBUG) {
      let msg = "<d>Network:</d>";
      for (const k in this.network.players) {
        const stamp = this.network.playerlocal.stamp;
        const p = this.network.players[k];
        const stampdelta = p.stamp - stamp;
        const stampdelta_s = `${stampdelta >= 0 ? "+" : "-"}${Math.abs(stampdelta)}`;
        msg += `<d>${stampdelta_s} ${p.tostring()}</d>`;
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

    if (this.network.playerlocal) {
      this.network.playerlocal.entities_count = this.level.entities_count;
      this.network.playerlocal.guids = this.level.guids;
    }

    this.process_network_players();
    this.precess_network_queries();
    this.process_network_entities_chunks();
  }

  process_network_entities_info() {
    this._entities_asked = this._entities_asked ?? 0;
    for (const k in this.network.players) {
      const p = this.network.players[k];
      if (p.local) {
        continue;
      }

      if (p.guids > this.level.guids) {
        this.level.guids = p.guids;
      }

      if (this.level.aentities.length > this.level.entities_count) {
        for (let i = 0; i < 10; i++) {
          const index = this._entities_asked;
          const id = this.level.aentities[index];
          if (id && !this.level.entities[id]) {
            this.network.send_entity_ask(id, index, p.id);
          }
          this._entities_asked =
            (this._entities_asked + 1) % this.level.aentities.length;
        }
      }
    }
  }

  process_network_entities_chunks() {
    // sync entities
    this._chunks_asked = this._chunks_asked ?? 0;
    for (const k in this.network.players) {
      const p = this.network.players[k];
      if (p.local) {
        continue;
      }

      if (p.entities_count > this.level.aentities.length) {
        const infos_length = NetPacket.infos_length[NET_PACKET_SIZE.LARGE];
        let index = this._chunks_asked * infos_length;
        while (this.level.aentities[index]) {
          this._chunks_asked += 1;
          index = this._chunks_asked * infos_length;
        }
        if (index < p.entities_count) {
          this.network.send_entities_ask(index, p.id);
          this._chunks_asked += 1;
        } else {
          this._chunks_asked = 0;
        }
      }
    }
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

        const entdraw = entity.entdraw;

        const pawnpos = this.pawn_local.get_pos();
        const pawnpos_b = this.pawn_local.path_b;
        // isn't best approach but acceptable
        this.network.send_game_action_pos(
          MESSAGE_GAME_ACTION_TYPE.POSITION_FORCED,
          pawnpos_b.x,
          pawnpos_b.y,
          pawnpos_b.z,
          p.id,
        );
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
    const rand = alea(id + this.level.seed);
    const spritesheet = new CharacterSpritesheetTestcase6Network();
    spritesheet.set_character(rand.range(0, 6)).load();

    // pawns is LOCAL entity. It doesn't listed in sync list
    // It should be.
    const entity = this.level.create_entity(spritesheet, id, null);
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
    this.level.remove_entity(id);
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

export default PageTestcase6NetworkD240829;
