import * as THREE from "three";
import {
  AnimationNode,
  Animator,
  AnimationMachine,
  ANIMATION_PLAYBACK_MODE,
  ANIMATION_TRANSITION_MODE,
} from "../animator";
import { Vec3Up, Vec3Right, angle_sub, cache } from "../math.js";

class PawnDrawA {
  constructor() {
    /** @type {THREE.Object3D} */
    this._target = null;
    /** @type {Animator} */
    this.animator = null;

    this.pos = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.goal = new THREE.Vector3();

		this.rotation = 0;

    this.allow_move = true;
  }

  /**
   * @param {THREE.Object3D} target
   */
  init(gltf, target) {
    this.animator = new Animator();
    this._target = target;
    this.gltf = gltf;
    this.pos.copy(this._target.position);
    this.goal.copy(this._target.position);

    this.animator.init(this._target, this.gltf);

    const am = this.animator.animation_machine;
    const register = (
      name,
      clipname,
      { playback_mode = ANIMATION_PLAYBACK_MODE.default, speed = 1 } = {},
    ) => {
      const clip = this.animator.getAnimation(clipname);
      if (!clip) {
        throw new Error(
          `Animator::register error - no clip "${clipname}" found`,
        );
      }
      const node = new AnimationNode(name, clip);
      node.playback_mode = playback_mode;
      clip.setEffectiveTimeScale(speed);
      am.register(node);
    };

    register("idle", "IDLE");
    register("run", "RUN");
    register("hit", "HIT", {
			speed: 2,
			playback_mode: ANIMATION_PLAYBACK_MODE.at_start
		});

    am.pair("idle", "run");
    am.pair("run", "idle", ANIMATION_TRANSITION_MODE.instant);
    am.pair("idle", "hit", ANIMATION_TRANSITION_MODE.instant);
    am.pair("hit", "run", ANIMATION_TRANSITION_MODE.instant);
    am.pair("hit", "idle", ANIMATION_TRANSITION_MODE.end);

    this.animator.transite("idle");
  }

  step(dt) {
    this.animator.step(dt * 1e-3);

    this.velocity.copy(this.pos.sub(this._target.position));
    this.pos.copy(this._target.position);

    const goal_delta = cache.vec3.v1.copy(this.goal).sub(this.pos);
		goal_delta.y = 0;
    const direction = cache.vec3.v2.copy(goal_delta).normalize();
    const direction_angle = Math.atan2(direction.x, direction.z);

    const df = dt / 30;
    const rotate = angle_sub(
      this.rotation,
      direction_angle - Math.PI / 2,
    );

    if (goal_delta.length() > 1e-1) {
      if (this.allow_move) {
        this._target.position.add(facing_direction.multiplyScalar(df * 0.04));
      }
      this.rotation += rotate * df * 0.1;
			this._target.rotation.y = this.rotation;
    }

    if (this.velocity.length() > 1e-5) {
      this.animator.transite("run");
    } else {
      this.animator.transite("idle");
    }
  }

  dispose() {
    this.gltf = null;
    this.animator = null;
    this._target = null;
  }
}

export default PawnDrawA;
