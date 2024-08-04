import logger from "./logger.js";

class Entity {
  /**
   * @param {Pool} pool .
   * @param {ArrayBuffer} buffer .
   */
  constructor(
    id = null,
    index = null,
    pool,
    buffer,
    offset = index * Entity.size(),
  ) {
    this._pool = pool;
    this._buffer = buffer;

    this._vpositions = new Float32Array(buffer, offset, 8);
    this._vstamps = new Uint32Array(buffer, offset + 20, 2);
    this._vflags = new Uint16Array(buffer, offset + 28, 1);
    this._vstats = new Uint16Array(buffer, offset + 30, 5);
    this._vtags = new Uint8Array(buffer, offset + 40, 4);

    this._len = new Uint8Array(buffer, offset, Entity.size());

		if (index !== null) {
			this.index = index;
		}
    if (id !== null) {
      this.id = id;
    }
  }

  init() {
    this.allocated = true;
    this.initialized = true;
    this.disposed = false;
  }

  dispose() {
    this.disposed = true;
    delete this._pool.entities[this.id];
    this._pool.allocated -= 1;
    const index = this.index;

    this._pool.history.splice(this._pool.history.indexOf(this.id), 1);

    // move last entity into disposed position
    if (this._pool.allocated > 0 && this._pool.allocated != index) {
      const last = new Entity(
        null,
        this._pool.allocated,
        this._pool,
        this._buffer,
      );
      this.copy(last);
      this.index = index;
      last.disposed = true;
    }
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
		this._len.set(entity._len);
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

    this.chunk_size = 256;

    this.guids = 0;

    /** @type {Array<Entity>} */
    this.entities = {};
    this.history = [];

    this.allocated = 0;
  }
  init() {
    this.buffer = new ArrayBuffer(this.chunk_size * Entity.size());

    return this;
  }
  allocate() {
    if (this.allocated >= this.chunk_size) {
      logger.error("Pool out of bounds! Can't create another entity");
      return null;
    }

    const id = this.guids++;
    const index = this.allocated++;
    const entity = new Entity(id, index, this, this.buffer);
    this.add(entity);

    return entity;
  }
  add(entity) {
    entity.allocated = true;
    this.entities[entity.id] = entity;
    this.history.push(entity.id);
  }
  free(id) {
    const entity = this.entities[id];
    entity.dispose();
  }
  dispose() {
    for (const k in this.entities) {
      this.free(k);
    }

    this.buffer = null;
  }
}

export { Pool, Entity };
