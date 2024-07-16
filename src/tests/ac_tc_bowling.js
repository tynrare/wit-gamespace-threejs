/** @namespace Pages/Tests */

import * as THREE from "three";
import { Vector3 } from "three";
import Loader from "../loader.js";
import PageBase from "../page_base.js";
import App from "../app.js";
import PawnDrawA from "../pawn/d240710_pawn.js";
import LightsA from "../lights_a.js";
import { angle_sub, dlerp, Vec3Right, Vec3Up, cache } from "../math.js";
import { Physics, RigidBody, RigidBodyType } from "../physics.js";
import Environment1 from "./environment_1.js";
import { oimo } from "../lib/OimoPhysics.js";

/**
 * @class AaTestcaseBowling
 * @memberof Pages/Tests
 */
class AaTestcaseBowling {
  constructor() {
    /** @type {PawnDrawA} */
    this.pawn = null;

    /** @type {Physics} */
    this.physics = null;

    /** @type {oimo.dynamics.rigidbody.RigidBody} */
    this.pawn_body = null;

    /** @type {THREE.Mesh} */
    this.pawn_dbg_mesh = null;

    /** @type {THREE.Object3D} */
    this.playscene = null;

    /** @type {Environment1} */
    this.environment = null;

    this.cache = {
      vec3_0: new Vector3(),
    };
  }

  /**
   * @virtual
   * @param {number} dt .
   */
  step(dt) {
    this.physics.step(dt);
    this.step_pawn(dt);
    this.animate(dt);

    this.stabilizate_pawn();
  }

  animate(dt) {
    if (!this.pawn) {
      return;
    }

    const star_size = this.pawn.stun > 0 ? 0.4 : 0;
    for (const i in this.vfx_animation_stars.children) {
      const c = this.vfx_animation_stars.children[i];
      c.scale.setScalar(dlerp(c.scale.x, star_size, 0.5, dt * 1e-3));
    }

    this.vfx_animation_stars.rotation.y += dt * 3e-3;
  }

  step_pawn(dt) {
    if (!this.pawn) {
      return;
    }
		this.step_pawn_collisions();
    const up = this.physics.get_body_up_dot(this.pawn_body);
    if (up < 0.9) {
      this.pawn.stun = 2;
    }

    // apply decoration mesh rotation
    const shift = cache.vec3.v0.set(0, -0.5, 0);
    shift.applyQuaternion(this.pawn_dbg_mesh.quaternion);
    this.pawn._target.position.copy(this.pawn_dbg_mesh.position);
    this.pawn._target.position.add(shift);
    this.pawn.step(dt);
    // cd: discard pawn rotation and set correct world rotation
    this.pawn._target.quaternion.copy(this.pawn_dbg_mesh.quaternion);
    this.pawn._target.rotateY(this.pawn.rotation);

    // place stars
    this.vfx_animation_stars.position.copy(this.pawn._target.position);
    this.vfx_animation_stars.position.y += 1;
    this.vfx_animation_stars.position.add(shift.multiplyScalar(-1));

    // spawn projectile in animation middleplay
    const action_hit = this.pawn.animator.animation_machine.nodes["hit"].action;
    if (
      this.spawn_projectile_requested &&
      action_hit.enabled &&
      action_hit.time > 0.5
    ) {
      this._spawn_projectile();
      this.spawn_projectile_requested = false;
    }
  }

  // dunno need this
  step_pawn_collisions() {
    /** @type {oimo.dynamics.ContactLink} */
    let link = this.pawn_body.getContactLinkList();
    while (link) {
      const contact = link.getContact();

      const body2 = link.getOther();

      link = link.getNext();
      if (!contact.isTouching()) {
        continue;
      }
      const manifold = contact.getManifold();
      manifold.getBinormal;
    }
  }

  stabilizate_pawn() {
    // locks rotation
    //this.pawn_body.setRotationFactor(this.physics.cache.vec3_0.init(0, 0, 0));

    // apply rotation stabilization
    const up = this.physics.get_body_up_dot(this.pawn_body);
    const stabilization = this.physics.cache.vec3_0;
    const r = this.pawn_body.getRotation().toEulerXyz();
    const s = 2;
		this.pawn_body.get
    stabilization.init(-r.x * s, 0, -r.z * s);
    stabilization.scaleEq(1 - up);
    this.pawn_body.applyTorque(stabilization);
  }

  animate_pawn() {}

  run(onload) {
    this.environment = new Environment1();
    this.environment.run({ floor: false });

    Promise.all([
      this._load_pawn().then(() => {
        this.pawn = new PawnDrawA();
        this.pawn.init(this.character_gltf, this.character_scene);
        App.instance.render.scene.add(this.character_scene);

        this.pawn_dbg_mesh.visible = false;
        this.pawn.allow_move = false;
      }),
      this.open_playscene("a"),
    ]).then(() => {
      if (onload) {
        onload();
      }
    });

    this.physics = new Physics().run({ fixed_step: false });
    this.physics.create_box(
      new Vector3(0, -1, 0),
      new Vector3(100, 2, 100),
      RigidBodyType.STATIC,
    );

    {
      const pos = new Vector3(0, 1, 0);
      const size = new Vector3(0.3, 1, 0);
      const id = this.create_physics_cylinder(
        pos,
        size,
        RigidBodyType.DYNAMIC,
        { friction: 0.1, density: 1, adamping: 5, ldamping: 1 },
        0x48a9b1,
      );
      const mesh = this.physics.meshlist[id];
      const body = this.physics.bodylist[id];
      this.pawn_body = body;
      this.pawn_dbg_mesh = mesh;
    }
  }

  /**
   * @param {THREE.Vector3} pos
   */
  set_goal(pos) {
    if (this.pawn) {
      this.pawn.goal.copy(pos);
    }
  }

  _spawn_projectile() {
    const radius = 0.4;
    const d = cache.vec3.v0;
    const pos = cache.vec3.v1;
    const facing_direction = d
      .copy(Vec3Right)
      .applyAxisAngle(Vec3Up, this.pawn.rotation);
    pos
      .copy(d)
      .setLength(radius * 2)
      .add(this.pawn._target.position);
    pos.y = 0.5;
    const impulse = this.physics.cache.vec3_0;
    impulse.init(d.x * 30, 0, d.z * 30);
    let color = new THREE.Color(Math.random(), Math.random(), Math.random());
    const body = this.physics.create_sphere(
      pos,
      radius,
      RigidBodyType.DYNAMIC,
      {
        density: 10,
        friction: 0.3,
        restitution: 0.7,
      },
    );
    const mesh = this.projectile_gltf.scene.clone();
    mesh.scale.multiplyScalar(radius * 2);
    mesh.position.copy(pos);
    App.instance.render.scene.add(mesh);
    this.physics.attach(body, mesh);
    body.applyLinearImpulse(impulse);
  }

  spawn_projectile() {
    this.spawn_projectile_requested = true;

    this.pawn.animator.transite("hit", true);
  }

  async _load_pawn() {
    this.character_gltf = await this.add_gltf("bowling/pawn1.glb", false);
    this.character_scene = this.character_gltf.scene;
    this.projectile_gltf = await this.add_gltf(
      "bowling/projectile1.glb",
      false,
    );

    const texture_sprite = Loader.instance.get_texture("pic/star0.png");
    const star_material = new THREE.SpriteMaterial({
      map: texture_sprite,
    });
    const sprite_star = new THREE.Sprite(star_material);
    sprite_star.scale.setScalar(0); // hide at creation
    this.vfx_animation_stars = new THREE.Object3D();
    App.instance.render.scene.add(this.vfx_animation_stars);

    const stars = 6;
    const radius = 0.3;
    for (let i = 0; i < stars; i++) {
      const s = sprite_star.clone();
      this.vfx_animation_stars.add(s);
      s.position.x = Math.sin((i / stars) * Math.PI * 2) * radius;
      s.position.z = Math.cos((i / stars) * Math.PI * 2) * radius;
    }
  }

  open_playscene(name, lightmaps = true) {
    return new Promise((resolve, reject) => {
      const root_path = `bowling/scenes/${name}/`;
      const load = (config) => {
        this.close_playscene();

        this.add_gltf(root_path + `scene.glb`).then((gltf) => {
          const scene = gltf.scene;
          this.playscene = scene;
          /** @type {THREE.Mesh} */
          const navmesh = /** @type {any} */ (scene.getObjectByName("navmesh"));
          if (navmesh) {
            navmesh.material.wireframe = true;
            this.navmesh.build(navmesh);
          }
          if (config) {
            LightsA.apply_lightmaps(scene, root_path, config);
          }
          LightsA.apply_lightmaps_white(scene);

          this.parse_playscene(scene);

          resolve();
        });
      };

      if (lightmaps) {
        Loader.instance
          .get_json(root_path + `lightmaps/config.json`)
          .then((config) => {
            load(config);
          });
      } else {
        load(null);
      }
    });
  }

  close_playscene() {
    this.navmesh?.dispose();
    this.playscene?.removeFromParent();
    this.playscene = null;
  }

  add_gltf(url, add_to_scene = true) {
    const render = App.instance.render;
    return Loader.instance.get_gltf(url).then((gltf) => {
      console.log(gltf);
      /** @type {THREE.Object3D} */
      const scene = gltf.scene;
      scene.traverse((o) => {
        /** @type {THREE.Mesh} */
        const m = /** @type {any} */ (o);
        if (!m.isMesh) {
          return;
        }
        m.castShadow = App.instance.render.config.shadows;
        m.receiveShadow = App.instance.render.config.shadows;
        this.environment.lights.csm?.setupMaterial(material);
        /** @type {THREE.MeshStandardMaterial} */
        const material = /** @type {any} */ (m.material);
        material.metalness = 0;
      });

      if (add_to_scene) {
        render.scene.add(scene);
      }

      return gltf;
    });
  }

  /**
   * @param {THREE.Object3D} scene .
   */
  parse_playscene(scene) {
    scene.traverse((o) => {
      /** @type {THREE.Mesh} */
      const m = /** @type {any} */ (o);
      if (!m.isMesh) {
        return;
      }
      if (!m.name.includes("phys")) {
        return;
      }
      const bb = m.geometry.boundingBox;
      const size = bb.getSize(cache.vec3.v0);
      const center = bb.getCenter(cache.vec3.v1);
      const pos = m.getWorldPosition(cache.vec3.v2);
      pos.add(center);
      const type = m.name.includes("dynamic")
        ? RigidBodyType.DYNAMIC
        : RigidBodyType.STATIC;
      const body = this.physics.create_box(pos, size, type);
      //this.physics.attach(body, m);
    });
  }

  create_material(color) {
    const material = new THREE.MeshPhongMaterial({
      color: color ?? 0xb768e9,
      emissive: 0x4f7e8b,
      shininess: 10,
      specular: 0xffffff,
    });

    return material;
  }

  /**
   * Creates box with mesh
   * @param {Vector3} pos .
   * @param {Vector3} size .
   * @param {RigidBodyType} type .
   * @param {number} color .
   * @returns {string} body id
   */
  create_physics_box(pos, size, type, color = 0xffffff) {
    const body = this.physics.create_box(pos, size, type);
    let geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    let material = this.create_material(color);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this.physics.attach(body, mesh);

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
    const body = this.physics.create_sphere(pos, radius, type, opts);
    let geometry = opts?.icosphere
      ? new THREE.IcosahedronGeometry(radius)
      : new THREE.SphereGeometry(radius);
    let material = this.create_material(color);
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this.physics.attach(body, mesh);

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
    const body = this.physics.create_cylinder(pos, size, type, opts);
    let geometry = new THREE.CylinderGeometry(size.x, size.x, size.y, 6);
    let material = this.create_material(color);
    material.wireframe = true;
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    this.physics.attach(body, mesh);

    return body.id;
  }

  stop() {
    this.pawn.dispose();
    this.environment.stop();
    this.pawn = null;
    this.character_scene = null;
    this.character_gltf = null;
    this.environment = null;
    this.close_playscene();
  }
}

export default AaTestcaseBowling;
