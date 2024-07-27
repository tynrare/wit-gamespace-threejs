/** @namespace Gamespace */
import * as THREE from "three";
import { MovementSystem, MovementEntity } from "./movement_system.js";
import Navmesh from "./navmesh.js";
import { Vector3 } from "three";
import { cache } from "../../math.js";
import logger from "../../logger.js";

/**
 * @class Projectile
 * @memberof Gamespace
 */
class Projectile {
  /**
   * @param {string} id .
   */
  constructor(id) {
    /** @type {THREE.Object3D} */
    this.mesh = null;

    this.id = id;

    this.origin = new Vector3();
    this.direction = new Vector3();
    this.velocity = new Vector3();

    this.active = false;
    this.alive = false;
    this.elapsed = 0;

    this.lifetime = 10;
    this.speed = 50;
  }

  step(dt) {
    if (!this.active || !this.alive) {
      return;
    }

    this.elapsed += dt;

    if (this.elapsed * 1e-3 > this.lifetime) {
      this.stop();
      return;
    }

    if (!this.mesh) {
      return;
    }

    const dir = cache.vec3.v0.copy(this.direction);
    dir.multiplyScalar(dt * 1e-3 * this.speed);
    this.velocity.copy(dir);
  }

  /**
   * @param {Vector3} origin
   * @param {Vector3} direction
   */
  init(origin, direction) {
    this.origin.copy(origin);
    this.direction.copy(direction);

    const geometry = new THREE.SphereGeometry(0.3);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(origin);
    this.mesh.position.z = 1;

    return this;
  }

  /**
   * @param {MovementEntity} entity .
   */
  run(entity) {
    this._entity = entity;

    this.active = true;
    this.alive = true;

    return this;
  }

  stop() {
    this.mesh?.removeFromParent();
    this.mesh = null;
    this.alive = false;
    this.active = false;
    this._entity.active = false;
    this._entity.alive = false;
  }
}

/**
 * @class ProjectilesSystem
 * @memberof Gamespace
 */
class ProjectilesSystem {
  constructor() {
    /** @type {THREE.Scene} */
    this._scene = null;

    /** @type {Object<string, Projectile>} */
    this.projectiles = {};
    this.guids = 0;
  }

  /**
   * @param {THREE.Scene} scene .
   * @param {Navmesh} navmesh .
   * @param {MovementSystem} movement_system .
   */
  init(scene, navmesh, movement_system) {
    this._scene = scene;
    this._navmesh = navmesh;
    this._movement_system = movement_system;

    return this;
  }

  step(dt) {
    for (const k in this.projectiles) {
      const p = this.projectiles[k];
      p.step(dt);

      if (!p.alive) {
        delete this.projectiles[k];
      }
    }
  }

  /**
   * @param {string} navmesh_id
   * @param {Vector3} origin
   * @param {Vector3} direction
   */
  spawn(navmesh_id, origin, direction) {
    logger.log("ProjectilesSystem::spawn");
    const id = "p" + this.guids++;
    const p = new Projectile(id).init(origin, direction);
    const entity = this._movement_system.add(
      {
        velocity: p.velocity,
      },
      p.mesh,
    );
    p.run(entity);

    const npoint = this._navmesh.register_copy(navmesh_id);
    entity.navmesh_id = npoint.id;
    npoint.mask = 0x00ff00;

    this.projectiles[id] = p;
    this._scene.add(p.mesh);
  }

  dispose() {
    this._scene = null;
    this._navmesh = null;
    this._movement_system = null;
    for (const k in this.projectiles) {
      this.projectiles[k].stop();
      delete this.projectiles[k];
    }
  }
}

export default ProjectilesSystem;
