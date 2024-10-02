import { Physics, RigidBody, RigidBodyType } from "../../physics.js";
import PawnDrawA from "./pawn_draw_bowling.js";
import LevelBowlingA from "./level_bowling.js";
import PawnActionsBowlingA from "./pawn_actions_bowling.js";
import { cache } from "../../math.js";
import { Vector3 } from "three";
import Loader from "../../loader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import App from "../../app.js";
import { InputAction } from "../../pawn/inputs_dualstick.js";
import PawnBehaviourBowlingA from "./pawn_behaviour_bowling.js";
import PawnVisualsBowlingA from "./pawn_visuals_bowling.js";
import * as THREE from "three";
import { oimo } from "../../lib/OimoPhysics.js";

class PawnBowlingA {
  /**
   * @param {string} id
   * @param {LevelBowlingA} level
   */
  constructor(id, level, team = 0) {
    /** @type {string} */
    this.id = id;
    /** @type {LevelBowlingA} */
    this._level = level;
    /** @type {Physics} */
    this._physics = level.physics;
    /** @type {oimo.dynamics.rigidbody.RigidBody} */
    this.pawn_body = null;
    /** @type {THREE.Mesh} */
    this.pawn_dbg_mesh = null;
    /** @type {PawnDrawA} */
    this.pawn_draw = null;
    /** @type {PawnActionsBowlingA} */
    this.pawn_actions = null;
    /** @type {PawnBehaviourBowlingA} */
    this.pawn_behaviour = null;
    /** @type {PawnVisualsBowlingA} */
    this.pawn_visuals = null;

    this.disposed = false;
    this.team = team;

    this.config = {
      body_linear_damping: 1,
      body_angular_dumping: 5,
			body_mass: 0.3,
			body_width: 0.3
    };

    this.body_linear_damping = this.config.body_linear_damping;
    this.body_angular_dumping = this.config.body_angular_dumping;
    this.body_mass = this.config.body_mass;
  }

  step(dt) {
    this.step_pawn_draw(dt);
    this.pawn_actions.step(dt);
    this.pawn_behaviour.step(dt);
    this.pawn_visuals.step(dt);
  }

  /**
   * @param {InputAction} type .
   * @param {boolean} start .
   */
  action(type, start) {
    this.pawn_actions.action(type, start);
  }
  /**
   * @param {number} x .
   * @param {number} z .
   * @param {InputAction} type .
   */
  action_analog(x, z, type) {
    this.pawn_actions.action_analog(x, z, type);
  }
  step_pawn_draw(dt) {
    // apply decoration mesh rotation
    const shift = cache.vec3.v4.set(0, -0.25, 0);
    shift.applyQuaternion(this.pawn_dbg_mesh.quaternion);
    this.pawn_draw._target.position.copy(this.pawn_dbg_mesh.position);
    this.pawn_draw._target.position.add(shift);
    this.pawn_draw.step(dt);
    // cd: discard pawn rotation and set correct world rotation
    this.pawn_draw._target.quaternion.copy(this.pawn_dbg_mesh.quaternion);
    this.pawn_draw._target.rotateY(this.pawn_draw.rotation);
  }

  async load() {
    await this._load_pawn();
    this._create_pawn_draw();
  }

  run() {
    const id = this._create_phys_body();
    const mesh = this._physics.meshlist[id];
    const body = this._physics.bodylist[id];

    this.pawn_body = body;
    this.pawn_dbg_mesh = mesh;

    this.pawn_actions = new PawnActionsBowlingA(this);
    this.pawn_behaviour = new PawnBehaviourBowlingA(this);
    this.pawn_visuals = new PawnVisualsBowlingA(this, this.team == 0 ? 0x00ff00 : 0xff0000).run();

    return this;
  }

  _create_phys_body() {
    const pos = new Vector3(0, 1, 0);
    const size = new Vector3(this.config.body_width, 1, 0);

    let meshgeometry = new THREE.CylinderGeometry(
      size.x,
      size.x,
      size.y,
      6,
    );
    let material = App.instance.render.utils.create_material0(0x48a9b1);
    let mesh = new THREE.Mesh(meshgeometry, material);
    mesh.castShadow = true;
    App.instance.render.scene.add(mesh);

    const body_config = new oimo.dynamics.rigidbody.RigidBodyConfig();
    body_config.position.init(pos.x, pos.y, pos.z);
    body_config.type = RigidBodyType.DYNAMIC;
    body_config.angularDamping = this.config.body_angular_dumping;
    body_config.linearDamping = this.config.body_linear_damping;

    const body = new RigidBody(body_config);

    const aheight = size.y * 0.25;
    const bheight = size.y * 0.35;

    {
      const geometry = new oimo.collision.geometry.CylinderGeometry(
        size.x,
        aheight,
      );
      const shape_config = new oimo.dynamics.rigidbody.ShapeConfig();
      shape_config.geometry = geometry;
      shape_config.density = 1;
      shape_config.friction = 0.1;
      shape_config.restitution = 0.1;
      const shape = new oimo.dynamics.rigidbody.Shape(shape_config);
      body.addShape(shape);
    }
    {
      const geometry = new oimo.collision.geometry.CylinderGeometry(
        size.x * 0.7,
        bheight,
      );
      const shape_config = new oimo.dynamics.rigidbody.ShapeConfig();
      shape_config.geometry = geometry;
      shape_config.position.init(0, aheight + bheight, 0);
      shape_config.density = 1;
      shape_config.friction = 0.1;
      shape_config.restitution = 0.1;
      const shape = new oimo.dynamics.rigidbody.Shape(shape_config);
      body.addShape(shape);
    }

    this._physics.add_body(body);
    this._physics.attach(body, mesh);

		const dm = body.getMassData();
		dm.mass = this.body_mass;
		body.setMassData(dm);

    body.userData = {
      type_pawn: true,
    };

    return body.id;
  }

  async _load_pawn() {
    this.character_gltf = await Loader.instance.get_gltf("bowling/pawn2.glb");
    this.character_scene = SkeletonUtils.clone(this.character_gltf.scene);
  }

  _create_pawn_draw() {
    this.pawn_draw = new PawnDrawA();
    this.pawn_draw.init(this.character_gltf, this.character_scene);
		this.character_scene.traverse((o) => {
      /** @type {THREE.Mesh} */
      const m = /** @type {any} */ (o);
      if (!m.isMesh) {
        return;
      }

      m.castShadow = true;
      m.receiveShadow = true;
		});
    App.instance.render.scene.add(this.character_scene);
    this.pawn_dbg_mesh.visible = false;
  }

  /**
   * @returns {Vector3} .
   */
  get position() {
    return this.pawn_dbg_mesh.position;
  }

  stop() {
    this.character_scene?.removeFromParent();
    this.pawn_dbg_mesh?.removeFromParent();
    this.pawn_visuals.stop();
    this.pawn_draw.dispose();
    this.character_scene = null;
    this.character_gltf = null;
    this.pawn_dbg_mesh = null;
    this.pawn_draw = null;
		this._physics.remove(this.pawn_body);
    this.disposed = true;
  }
}

export default PawnBowlingA;
