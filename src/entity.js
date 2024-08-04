class Entity {
  /**
   * @param {Pool} pool .
   * @param {ArrayBuffer} buffer .
   */
  constructor(id, index, pool, buffer) {
    this._pool = pool;
    this._buffer = buffer;

    const shift = index * Entity.size();

    this._vpositions = new Float32Array(buffer, shift, 8);
    this._vstamps = new Uint32Array(buffer, shift + 20, 2);
    this._vflags = new Uint16Array(buffer, shift + 28, 1);
    this._vstats = new Uint16Array(buffer, shift + 30, 5);
    this._vtags = new Uint8Array(buffer, shift + 40, 4);

    this._len = new Uint8Array(buffer, shift, Entity.size());

    this.id = id;
    this.index = index;
  }

  init() {
    this.allocated = true;
    this.initialized = true;
    this.disposed = false;
  }

  dispose() {
    this.disposed = true;
    delete this._pool.entities[this.id];
    this._pool.disposed.push(this.index);
    this._pool.allocated -= 1;
  }

	/**
	 * @returns {number}
	 */
  get id() {
    return this._vstats[0];
  }

  set id(v) {
    return (this._vstats[0] = v);
  }

	/**
	 * @returns {number}
	 */
  get index() {
    return this._vstats[1];
  }

  set index(v) {
    return (this._vstats[1] = v);
  }

	/**
	 * @returns {number}
	 */
  get type() {
    return this._vstats[2];
  }

  set type(v) {
    return (this._vstats[2] = v);
  }

	/**
	 * @returns {number}
	 */
  get seed() {
    return this._vstats[3];
  }

  set seed(v) {
    return (this._vstats[3] = v);
  }

	/**
	 * @returns {number}
	 */
  get timestamp() {
    return this._vstamps[0];
  }

  set timestamp(v) {
    return (this._vstamps[0] = v);
  }

	/**
	 * @returns {Float32Array} length 4
	 */
  get positions() {
    return this._vpositions;
  }

  /**
   * @returns {boolean}
   */
  get allocated() {
    return this.get_flag(0);
  }

  /**
   * @param {boolean} v .
   */
  set allocated(v) {
    this.set_flag(v, 0);
  }

  /**
   * @param {boolean} v .
   */
  set initialized(v) {
    this.set_flag(v, 1);
  }

  /**
   * @returns {boolean}
   */
  get initialized() {
    return this.get_flag(1);
  }

  /**
   * @param {boolean} v .
   */
  set disposed(v) {
    this.set_flag(v, 2);
  }

  /**
   * @returns {boolean}
   */
  get disposed() {
    return this.get_flag(2);
  }

  /**
   * @param {boolean} v .
   * @param {number} index flag index
   */
  set_flag(value, index) {
    return (this.flags =
      (this.flags & ~(0b1 << index)) | ((Boolean(value) * 0b1) << index));
  }

  /**
   * @param {number} index flag index
   */
  get_flag(index) {
    return this.flags & (0b1 << index);
  }

  get flags() {
    return this._vflags[0];
  }

  set flags(v) {
    return (this._vflags[0] = v);
  }

  /**
   * @param {Entity} entity .
   */
  copy(entity) {
    return this.set(entity.index, entity._buffer);
  }

  set(index, buffer) {
    const size = Entity.size();
    this._len.set(new Uint8Array(buffer, index * size, size));

    return this;
  }

  /**
   * size in bytes
   */
  static size() {
    return 44;
  }
}

class Pool {
  constructor() {
    /** @type {ArrayBuffer} */
    this.buffer = null;

    this.chunk_size = 100;

    this.guids = 0;

    this.last = 0;
    this.disposed = [];
    /** @type {Array<Entity>} */
    this.entities = {};

    this.allocated = 0;
  }
  init() {
    this.buffer = new ArrayBuffer(this.chunk_size * Entity.size());

    return this;
  }
  allocate() {
    const id = this.guids++;
    const index = this.disposed.pop() ?? this.last++;
    const entity = new Entity(id, index, this, this.buffer);
    entity.allocated = true;
    this.entities[id] = entity;
    this.allocated += 1;

    return entity;
  }
  free(id) {
    const entity = this.entities[id];
    entity.dispose();
  }
	dispose() {
		for(const k in this.entities) {
			this.free(k);
		}

		this.buffer = null;
	}
}

export { Pool, Entity };
