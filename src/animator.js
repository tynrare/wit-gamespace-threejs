import * as THREE from "three";

/**
 * @typedef AnimationPath
 * @property {number} length
 * @property {sting} start
 * @property {sting} end
 * @property {sting} next
 */

/*
    Instant: Will switch to the next state immediately. The current state will end and blend into the beginning of the new one.

    Sync: Will switch to the next state immediately, but will seek the new state to the playback position of the old state.

    End: Will wait for the current state playback to end, then switch to the beginning of the next state animation.
*/
const ANIMATION_TRANSITION_MODE = {
	instant : 0,
	sync : 1,
	end : 2,
}

const ANIMATION_PLAYBACK_MODE = {
	default : 0,
	at_start : 1,
}

class AnimationNode {
	/**
	 * @param {string} id
	 * @param {THREE.AnimationAction} action
	 */
	constructor(id, action) {
		this.id = id;
		this.action = action;
		/** @type {Object<string, AnimationEdge} */
		this.edges = {};
		/** @type {Object<string, AnimationPath} */
		this.paths = {};
		this.playback_mode = ANIMATION_PLAYBACK_MODE.default;
	}
}

class AnimationEdge {
	/**
	 * @param {string} start
	 * @param {string} end
	 */
	constructor(start, end) {
		this.transition_mode = ANIMATION_TRANSITION_MODE.instant;
		this.start = start;
		this.end = end;
		this.id = `${start}-${end}`;
	}
}

/**
 * Builds node graph for animation sequences
 */
class AnimationMachine {
	constructor() {
		/** @type {Object<string, AnimationNode} */
		this.nodes = {};
		/** @type {Object<string, AnimationEdge} */
		this.edges = {};
		/** @type {Array<string} */
		this.query_nodes = [];
	}

	/*
	 * Adds new node into scope
	 *
	 * @param {AnimationNode } node .
	 */
	register(node) {
		if (this.nodes[node.id]) {
			throw new Error(
				`AnimationMachine::register error - node "${node.id}" already exists`
			);
		}

		this.nodes[node.id] = node;
	}

	/*
	 * Creates connection between two nodes. Also calculates all connection paths
	 *
	 * @param {string} from
	 * @param {string} to
	 */
	pair(
		from,
		to,
		transition_mode = ANIMATION_TRANSITION_MODE.instant
	) {
		const nodea = this.nodes[from];
		const nodeb = this.nodes[to];

		if (!nodea || !nodeb) {
			throw new Error(
				`AnimationMachine::pair error - node "${from}" or "${to}" was not registered`
			);
		}

		const edge = new AnimationEdge(from, to);
		if (this.edges[edge.id]) {
			throw new Error(
				`AnimationMachine::pair error - edge ${edge.id} already exists`
			);
		}

		edge.transition_mode = transition_mode;
		this.edges[edge.id] = edge;
		nodea.edges[nodeb.id] = edge;
		nodeb.edges[edge.id] = edge;
		this._build_path(nodea);
	}

	/**
	 * @param {AnimationNode} node  new node to calculate pah
	 * @param {Object<string, AnimationNode>} _traversed internal deadlock safe
	 */
	_build_path(
		node,
		_traversed = {}
	) {
		// full loop reached
		if (_traversed[node.id]) {
			return;
		}

		_traversed[node.id] = node;

		// a. build direct path
		for (const k in node.edges) {
			const edge = node.edges[k];
			if (edge.start != node.id) {
				continue;
			}
			const nodeb = this.nodes[edge.end];

			// a.1 build direct path
			node.paths[nodeb.id] = {
				length: 1,
				start: edge.start,
				end: edge.end,
				next: edge.end,
			};

			// a.2 build all dependent path

			for (const pk in nodeb.paths) {
				const path = nodeb.paths[pk];
				if ((node.paths[path.end]?.length ?? Infinity) - 1 < path.length) {
					continue;
				}
				node.paths[path.end] = {
					length: path.length + 1,
					start: node.id,
					end: path.end,
					next: nodeb.id,
				};
			}
		}

		// b. traverse all paths
		for (const k in node.edges) {
			const edge = node.edges[k];
			if (edge.end != node.id) {
				continue;
			}

			this._build_path(this.nodes[edge.start], _traversed);
		}
	}

	/*
	 * Queries all nodes into sequence
	 *
	 * @param {string} target
	 * @param {boolean} instant
	 */
	query(target, instant = true) {
		if (!this.query_nodes.length) {
			this.query_nodes.push(this.nodes[target].id);
			return;
		}

		if (instant) {
			while (this.query_nodes.length > 1) {
				this.query_nodes.pop();
			}
		}

		let nodename = this.query_nodes[this.query_nodes.length - 1];

		while (nodename !== target) {
			const node = this.nodes[nodename];
			const next = node.paths[target]?.next;

			if (!next) {
				throw new Error(
					`AnimationMachine::query error - ${this.query_nodes[0]} has no path to ${target}`
				);
			}

			nodename = this.nodes[next].id;
			this.query_nodes.push(nodename);
		}
	}
}

/*
 * Core behaviour inspired by animation - https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html#statemachine
 */
class Animator {
	constructor() {
		/** @type {THREE.AnimationMixer} */
		this.animation_mixer = null;
		/** @type {AnimationMachine} */
		this.animation_machine = null;
		/** @type {Object<string, THREE.AnimationAction>} */
		this.animations_actions_cache = null;
		/** @type {THREE.Scene} */
		this.scene = null;
		this.gltf = null;
		this.animation_time_scale = 1;
		this.fadetime = 0.1;
	}

	/**
	 * @param {THREE.Scene} scene
	 * @param {any} gltf
	 */
	init(scene, gltf) {
		this.scene = scene;
		this.gltf = gltf;
		this.animation_mixer = new THREE.AnimationMixer(scene);
		this.animation_machine = new AnimationMachine();
		this.animations_actions_cache = {};
		this.animation_mixer.addEventListener(
			"loop",
			this._on_mixer_loop.bind(this)
		);
	}

	_on_mixer_loop(event) {
		/** @type {THREE.AnimationAction} */
		const action = event.action;

		const nodename = this.animation_machine.query_nodes[0];
		const node = this.animation_machine.nodes[nodename];
		if (action != node.action) {
			return;
		}

		if (this.animation_machine.query_nodes.length <= 1) {
			return;
		}

		this._play_next();
	}

	_play_next() {
		if (this.animation_machine.query_nodes.length > 1) {
			const nodename = this.animation_machine.query_nodes.shift();
			const node = this.animation_machine.nodes[nodename];
			const oldaction = node.action;
			this.actionFadeOut(oldaction);
		}

		const nodename = this.animation_machine.query_nodes[0];
		const node = this.animation_machine.nodes[nodename];
		const newaction = node.action;
		if (node.playback_mode === ANIMATION_PLAYBACK_MODE.at_start) {
			newaction.time = 0;
		}
		this.actionFadeIn(newaction);
	}

	step(dt) {
		if (this.animation_mixer) {
			this.animation_mixer.update(dt * this.animation_time_scale);
		}
	}

	/**
	 * @param {string} target
	 * @param {boolean} instant
	 */
	transite(target, instant = true) {
		const qn = this.animation_machine.query_nodes;
		const last_node = qn[qn.length - 1];
		if (target === last_node) {
			return;
		}

		this.animation_machine.query(target, instant);

		// switch instantly if node type allows
		const node0 = qn[0];
		const node1 = qn[1];
		const edge = this.animation_machine.nodes[node0]?.edges[node1];
		if (edge && edge.transition_mode !== ANIMATION_TRANSITION_MODE.instant) {
			return;
		}

		this._play_next();
	}

	/**
	 * @param {THREE.AnimationAction} action
	 */
	actionFadeOut(action) {
		action.paused = true;
		action.setEffectiveWeight(1);
		action.fadeOut(this.fadetime);
	}

	/**
	 * @param {THREE.AnimationAction} action
	 */
	actionFadeIn(action) {
		action.paused = false;
		action.enabled = true;
		action.setEffectiveWeight(1);
		action.fadeIn(this.fadetime);
	}

	/**
	 * @param {string?} name
	 * @returns {THREE.AnimationAction?} .
	 */
	getAnimation(
		name,
		gltf = this.gltf
	) {
		if (!name) {
			return null;
		}

		if (!this.animation_mixer) {
			throw new Error(
				"CharacterRender::playAnimation error - No animation mixer set"
			);
		}

		let action =
			this.animations_actions_cache[name] ??
			this.animation_mixer.clipAction(
				THREE.AnimationClip.findByName(gltf, name)
			);
		if (!action) {
			return null;
		}
		this.animations_actions_cache[name] = action;
		action.play();
		action.enabled = true;
		action.paused = true;
		action.setEffectiveTimeScale(1);
		action.setEffectiveWeight(0);
		return action;
	}
}

export default Animator;
export {
	Animator,
	AnimationMachine,
	AnimationNode,
	ANIMATION_TRANSITION_MODE,
	ANIMATION_PLAYBACK_MODE,
};
