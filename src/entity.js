
class Pool {
	constructor() {
		/** @type {ArrayBuffer} */
		this.buffer = null;

		this.chunk_size = 100;
	}
	init() {
		this.buffer = new ArrayBuffer();
	}
}
class Entity {
	/** @param {Pool} . */
	constructor(pool) {
	}
	init() {
	}
}
