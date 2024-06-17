/** @namespace Gamespace */
import * as THREE from "three";
import Navmesh from "./navmesh.js";
import { cache } from "./math.js";

/**
 * @typedef MovementEntityProperties
 * @property {THREE.Vector3} velocity
 * @property {THREE.Vector3?} [torque]
 */

class MovementEntity {
  /**
   * @param {string} id .
   * @param {MovementEntityProperties} properties .
   * @param {THREE.Object3D} target .
   */
  constructor(id, properties, target) {
    this.properties = properties;
    this.target = target;
    this.id = id;
    this.alive = true;
    this.active = true;
    /** @type {string?} */
    this.navmesh_id = null;
  }
}

class MovementSystem {
  constructor() {
    this.guids = 0;
    /** @type {Object<string, MovementEntity>} */
    this.entities = {};
  }

  /**
   * @param {Navmesh} navmesh .
   */
  init(navmesh) {
    this._navmesh = navmesh;

    return this;
  }

  /**
   * @param {MovementEntityProperties} properties .
   * @param {THREE.Object3D} target .
   * @returns {MovementEntity} .
   */
  add(properties, target) {
    const id = "e" + this.guids++;
    const entity = new MovementEntity(id, properties, target);
    this.entities[id] = entity;

    return entity;
  }

  step(dt) {
    for (const k in this.entities) {
      const e = this.entities[k];
      if (!e.active) {
        continue;
      }
      if (!e.alive) {
        delete this.entities[k];
        continue;
      }

      const pos = cache.vec3.v0.copy(e.target.position);
      pos.add(e.properties.velocity);
      if (e.navmesh_id) {
        pos.copy(this._navmesh.move(e.navmesh_id, pos));
      }
      e.target.position.copy(pos);
      if (e.properties.torque) {
        e.target.rotation.x += e.properties.torque.x;
        e.target.rotation.y += e.properties.torque.y;
        e.target.rotation.z += e.properties.torque.z;
      }
    }
  }

  dispose() {
    this.entities = {};
    this._navmesh = null;
  }
}

export default MovementSystem;
export { MovementSystem, MovementEntity };
