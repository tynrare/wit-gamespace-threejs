import Physics from "./physics";
import App from "./app.js";
import * as THREE from "three";

class PhysicsUtils {
    /**
     * 
     * @param {Physics} physics .
     */
    constructor(physics) {
        this._physics = physics;
    }


  /**
   * Creates box with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {object} [opts] .
   * @param {number} color .
   * @returns {string} body id
   */
  create_physics_box(pos, size, type, otps, color = 0xffffff) {
    const body = this._physics.create_box(pos, size, type, otps);
    let geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    let material = App.instance.render.utils.create_material0(color);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this._physics.attach(body, mesh);

    return body.id;
  }

  /**
   * Creates sphere with mesh
   * @param {Vector3} pos .
   * @param {number} sphere .
   * @param {RigidBodyType} type .
   * @param {object} [opts] .
   * @param {boolean} [opts.icosphere] .
   * @param {number} [color=0xffffff] .
   * @returns {string} body id
   */
  create_physics_sphere(pos, radius, type, opts, color = 0xffffff) {
    const body = this._physics.create_sphere(pos, radius, type, opts);
    let geometry = opts?.icosphere
      ? new THREE.IcosahedronGeometry(radius)
      : new THREE.SphereGeometry(radius);
    let material = App.instance.render.utils.create_material0(color);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this._physics.attach(body, mesh);

    return body.id;
  }

  /**
   * Creates cylinder with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {object?} [opts] .
   * @param {number} [opts.friction=1] .
   * @param {number} [color] .
   * @returns {string} body id
   */
  create_physics_cylinder(pos, size, type, opts, color = 0xffffff) {
    const body = this._physics.create_cylinder(pos, size, type, opts);
    let geometry = new THREE.CylinderGeometry(size.x, size.x, size.y, 6);
    let material = App.instance.render.utils.create_material0(color);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this._physics.attach(body, mesh);

    return body.id;
  }
}

export default PhysicsUtils;
