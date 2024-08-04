import * as THREE from "three";
import App from "../app.js";
import { Vec3Up, cache } from "../math.js";
import PawnMap from "../pawn/pawn_map.js";
import { Entity } from "../entity.js";
import alea from "../lib/alea.js";
import Loader from "../loader.js";

const ENTITY_SPRITESHEET_TYPE = {
  NONE: 0,
  CHARACTER: 1,
  PROP: 2,
  GRASS: 3,
};

class SpritesheetAnimationSource {
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

    this.type = ENTITY_SPRITESHEET_TYPE.NONE;

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
   * @param {ENTITY_SPRITESHEET_TYPE} type .
   * @param {string|number} seed .
   */
  set_type(type, seed) {
    const rand = alea("" + seed);
    switch (type) {
      case ENTITY_SPRITESHEET_TYPE.CHARACTER:
        this.set_character(rand.range(0, 5));
        break;
      case ENTITY_SPRITESHEET_TYPE.PROP:
        this.set_prop(rand.range(0, 3));
        break;
      case ENTITY_SPRITESHEET_TYPE.GRASS:
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
        once: true,
      },
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

class SpriteAnimated {
  /**
   * @param {SpritesheetAnimationSource} spritesheet set_*() and load() it first.
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

    const pawnpos = this._pawn.get_pos(cache.vec3.v0);
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

class EntitySprite {
  /**
   * @param {Entity} entity .
   */
  constructor(entity) {
    this.entity = entity;
    /** @type {SpriteAnimated} */
    this.draw = null;
    /** @type {PawnMap} */
    this.pawn = null;
    this.pickable = true;
  }

	get id() {
		return this.entity.id;
	}

  /**
   * @param {ENTITY_SPRITESHEET_TYPE} type .
   * @param {string} seed .
   */
  init() {
    const spritesheet = new SpritesheetAnimationSource();
    spritesheet.set_type(this.entity.type, this.entity.seed).load();

    switch (this.entity.type) {
      case ENTITY_SPRITESHEET_TYPE.CHARACTER:
        break;
      case ENTITY_SPRITESHEET_TYPE.PROP:
        break;
      case ENTITY_SPRITESHEET_TYPE.GRASS:
        this.pickable = false;
        break;
    }

    this.entity.init();

    this.pawn = new PawnMap(this.entity);
    const draw = new SpriteAnimated(spritesheet);
    draw.run(this.pawn);
    this.draw = draw;

    return this;
  }

  run() {
    return this;
  }

  teleport(pos) {
    this.pawn.teleport(pos);
    this.draw.sprite.position.copy(pos);
    this.draw.sprite.position.y += this.draw.spritesheet.world_shift_y;
  }

  step(dt) {
    this.pawn.step(dt);
    this.draw.step(dt);

    // fixin threejs cloned textures bug
    if (this.draw.spritesheet.texture.image && !this.draw.sprite.parent) {
      App.instance.render.scene.add(this.draw.sprite);
    }
  }

  dispose() {
		this.entity.dispose();
    this.draw.sprite.removeFromParent();
    this.draw = null;
    this.pawn = null;
  }
}

export {
  ENTITY_SPRITESHEET_TYPE,
  SpritesheetAnimationSource,
  SpriteAnimated,
  EntitySprite,
};
