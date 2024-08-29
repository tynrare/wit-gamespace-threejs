import { Peer, Network as Netlib } from "@poki/netlib";
import logger from "../../logger.js";
import Loop from "../../loop.js";
import { Pool, Entity } from "../../entity.js";

const fakenames = ["Bob", "Glob", "Dog", "Borg", "Dong", "Clomp"];

const MESSAGE_TYPE = {
  GREET: 0,
  SYNC: 1,
  NEIGHBORS: 2,
  GAME: 3,
  ENTITY: 4,
  ENTITY_UPDATE: 5,
	PAWN_ASSIGN: 6
};

const MESSAGE_SUBTYPE = {
  ASK: 0,
  RESPONSE: 1,
};

const MESSAGE_GAME_ACTION_TYPE = {
  GATHER: 1,
};

const MESSAGE_ENTITY_UPDATE_TYPE = {
  POSITION: 0,
};

const NET_PACKET_SIZE = {
  BASIC: 0,
  LARGE: 1,
  EXTRA_LARGE: 2,
  ENTITY: 3,
};

class NetPacket {
  /**
   * @param {NET_PACKET_SIZE) size .
   */
  constructor(size = NET_PACKET_SIZE.BASIC, latency = 0) {
    this.latency = 0;

    let infos_length = NetPacket.infos_length[size];

    const buffer = new ArrayBuffer(12 + infos_length * 2);
    this.buffer = buffer;
    this._vtype = new Uint8Array(buffer, 0, 1);
    this._vsubtype = new Uint8Array(buffer, 1, 1);
    this._vstamp = new Uint16Array(buffer, 2, 2);
    this.tags = new Uint16Array(buffer, 6, 3);

    // pos and info shares same memory block.
    this.pos = new Float32Array(buffer, 12, infos_length / 2);
    this.info = new Uint16Array(buffer, 12, infos_length);
    this.info_short = new Uint8Array(buffer, 12, infos_length * 2);

    this._len = new Uint8Array(buffer);
  }

  get type() {
    return this._vtype[0];
  }

  set type(v) {
    return (this._vtype[0] = v);
  }

  get subtype() {
    return this._vsubtype[0];
  }

  set subtype(v) {
    return (this._vsubtype[0] = v);
  }

  get stamp() {
    return this._vstamp[0];
  }

  set stamp(v) {
    return (this._vstamp[0] = v);
  }

  get index() {
    return this._vstamp[1];
  }

  set index(v) {
    return (this._vstamp[1] = v);
  }

  copy(buffer) {
    this._len.set(new Uint8Array(buffer));

    return this;
  }

  static size_by_type(type, subtype) {
    switch (type) {
      case MESSAGE_TYPE.ENTITY_UPDATE:
        return NET_PACKET_SIZE.ENTITY;
      case MESSAGE_TYPE.ENTITY:
        if (subtype == MESSAGE_SUBTYPE.RESPONSE) {
          return NET_PACKET_SIZE.ENTITY;
        }
      // no-break
      default:
        return NET_PACKET_SIZE.BASIC;
    }
  }
}

NetPacket.infos_length = {};
NetPacket.infos_length[NET_PACKET_SIZE.BASIC] = 8;
NetPacket.infos_length[NET_PACKET_SIZE.LARGE] = 16;
NetPacket.infos_length[NET_PACKET_SIZE.EXTRA_LARGE] = 128;
NetPacket.infos_length[NET_PACKET_SIZE.ENTITY] = Entity.size();

class NetPlayer {
  /**
   * @param {string?} [name] .
   * @param {sting?} [id] .
   */
  constructor(local = false, name = null, id = "") {
    this.name = name ?? fakenames[Math.floor(Math.random() * fakenames.length)];
    this.stamp = 0;
    this.sent = 0;
    this.id = id ?? "";
    this.pawn = 0;
		this.guids = 0;
		this.entities_count = 0;

    this.alatency = 0;

    this.creator = false;
    this.local = local;

    this.neighbors = [];

    this.packet = new NetPacket();
    this.packet_large = new NetPacket(NET_PACKET_SIZE.EXTRA_LARGE);
    this.packet_entity = new NetPacket(NET_PACKET_SIZE.ENTITY);
    /** @type {Array<NetPacket>} */
    this.query = [];
  }

  tostring() {
    const latency = this.alatency.toFixed(0).padStart(3, "0");
    const title = this.local ? "(  You  )" : "(" + latency + "ms)";
    const id = this.id.substr(-5);
    const stamp = this.stamp.toString().padStart(4, "0");
    const ec = this.entities_count.toString().padStart(4, "0");
    return `${stamp} | 📦${ec}, #${this.guids} |  ${title} ${this.name} #${id}`;
  }
}

class Network {
  constructor(uuid) {
    /** @type {Netlib} */
    this.netlib = null;

    this.uuid = uuid ?? "0cedcf29-999d-4d80-864a-a38caa98182e";

    this.config = {
      max_players: 8,
      routine_dt: 100,
    };

    /** @type {Pool} */
    this.pool = null;

    /** @type {Loop} */
    this.loop = null;

    /** @type {NetPlayer} */
    this.playerlocal = null;

    // players tagged by peer id
    /** @type {Object<string, NetPlayer>} */
    this.players = {};

    this.players_count = 0;

    this.connected = false;
  }

  /**
   * @param {Peer} peer .
   * @param {string} channel .
   * @param {string} data .
   */
  _on_message(peer, channel, data) {
    let player = this.players[peer.id];

    if (typeof data === "string" && data[0] === "s") {
      logger.log(
        `Network: received '${data}' on channel ${channel} from ${peer.id}`,
      );

      const args = data.split(",");
      const type = parseInt(args[1]);

      if (type === MESSAGE_TYPE.GREET) {
        return this._receive_greet(peer, args[2]);
      }

      if (!player) {
        return;
      }

      switch (type) {
        case MESSAGE_TYPE.NEIGHBORS:
          return this._receive_neighbors(player, args[2]);
      }
    }
    if (!player) {
      return;
    }

    const p = player.packet_large;
    p.copy(data);

    player.alatency = peer.latency.average;

    switch (p.type) {
      case MESSAGE_TYPE.SYNC:
        return this._receive_sync(player, p);
      case MESSAGE_TYPE.ENTITY:
        if (p.subtype == MESSAGE_SUBTYPE.ASK) {
          return this._receive_entity_ask(player, p);
        } else {
          return this._receive_entity_response(player, p);
        }
      case MESSAGE_TYPE.ENTITY_UPDATE:
        return this._receive_entity_update(player, p);
      case MESSAGE_TYPE.PAWN_ASSIGN:
				return this._receive_pawn_assign(player, p);
      default: {
        const packet = new NetPacket(
          NetPacket.size_by_type(p.type, p.subtype),
          peer.latency.last,
        );
        packet.copy(data);
        player.query.push(packet);
        break;
      }
    }
  }

  _send_neighbors() {
    let neighbors = "";
    const peers = this.netlib.peers.keys();
    this.playerlocal.neighbors.length = 0;
    for (const k of peers) {
      neighbors += k + ";";
      this.playerlocal.neighbors.push(k);
    }
    const msg = `s,${MESSAGE_TYPE.NEIGHBORS},${neighbors}`;
    this.netlib.broadcast("reliable", msg);
  }

  _receive_neighbors(player, args) {
    player.neighbors.length = 0;
    const newneighbors = args.split(";");
    for (const i in newneighbors) {
      const n = newneighbors[i];
      if (!n.length) {
        continue;
      }
      player.neighbors.push(n);
    }
  }

  _send_greet(to) {
    let msg = `s,${MESSAGE_TYPE.GREET},${this.playerlocal.name}`;
    this.netlib.send("reliable", to, msg);
  }

  _receive_greet(peer, name) {
    const player = (this.players[peer.id] = new NetPlayer(
      false,
      name,
      peer.id,
    ));

    this._send_neighbors();
    // send sync forced
    this._send_sync(true, peer.id);

    return player;
  }

  _send_sync(reliable = false, to = null) {
    const p = this.playerlocal.packet;

    p.type = MESSAGE_TYPE.SYNC;
    p.stamp = this.playerlocal.stamp;
    p.index = this.playerlocal.sent++;
		p.tags[0] = this.playerlocal.guids;
		p.tags[1] = this.playerlocal.entities_count;
		p.tags[2] = this.playerlocal.pawn;

    const channel = reliable ? "reliable" : "unreliable";
    if (to) {
      this.netlib.send(channel, to, p.buffer);
    } else {
      this.netlib.broadcast(channel, p.buffer);
    }
  }

  _receive_sync(player, packet) {
    player.stamp = packet.stamp;
    player.sent = Math.max(packet.index, player.sent);
		player.guids = packet.tags[0];
		player.entities_count = packet.tags[1];
		player.pawn = packet.tags[2];
  }

  _send_entity_ask(player, index) {
    const p = this.playerlocal.packet;

    p.type = MESSAGE_TYPE.ENTITY;
    p.subtype = MESSAGE_SUBTYPE.ASK;
    p.stamp = this.playerlocal.stamp;
    p.index = this.playerlocal.sent++;
    p.tags[0] = index;

    this.netlib.send("unreliable", player.id, p.buffer);
  }

  _receive_entity_ask(player, packet) {
    const p = this.playerlocal.packet_entity;

    p.type = MESSAGE_TYPE.ENTITY;
    p.subtype = MESSAGE_SUBTYPE.RESPONSE;
    p.index = packet.index;

    const index = packet.tags[0];
    const entity = this.pool.entities[this.pool.history[index]];

    if (entity) {
      p.tags[0] = 1;
      p.info_short.set(entity._len);
    } else {
      p.tags[0] = 0;
    }

    this.netlib.send("unreliable", player.id, p.buffer);
  }

  /**
   * @param {NetPacket} packet .
   */
  _receive_entity_response(player, packet) {
    const refentity = new Entity(
      null,
      null,
      this.pool,
      packet.info.buffer,
      packet.info.byteOffset,
    );
    if (this.pool.entities[refentity.id]) {
      return;
    }
    const entity = new Entity(
      refentity.id,
      refentity.index,
      this.pool,
      this.pool.buffer,
    );
    entity.copy(refentity);
    this.pool.add(entity);
    this.pool.allocated += 1;
  }

  /**
   * @param {Entity} entity
   * @param {MESSAGE_ENTITY_UPDATE_TYPE} type .
   */
  send_entity_update(entity, type) {
    const p = this.playerlocal.packet_entity;

    p.type = MESSAGE_TYPE.ENTITY_UPDATE;
    p.subtype = type;
    p.stamp = this.playerlocal.stamp;
    p.index = this.playerlocal.sent++;
    p.info_short.set(entity._len);

    this.netlib.broadcast("reliable", p.buffer);
  }

  /**
   * @param {NetPlayer} player .
   * @param {NetPacket} packet .
   */
  _receive_entity_update(player, packet) {
    const refentity = new Entity(
      null,
      null,
      this.pool,
      packet.info.buffer,
      packet.info.byteOffset,
    );
    const entity = this.pool.entities[refentity.id];
    if (!entity) {
      return;
    }

    switch (packet.subtype) {
      case MESSAGE_ENTITY_UPDATE_TYPE.POSITION:
        // sets "position b" - entity movement goal
        entity.positions[3] = refentity.positions[3];
        entity.positions[4] = refentity.positions[4];
        entity.positions[5] = refentity.positions[5];
				entity.updated = true;
        break;
    }
  }


  routine(dt) {
    if (!this.connected) {
      return;
    }

    this.playerlocal.stamp += dt / this.config.routine_dt;
    this.playerlocal.entities_count = this.pool.allocated;
    this.playerlocal.guids = this.pool.guids;

    this._send_sync();
  }

  init() {
    this.netlib = new Netlib(this.uuid);

    this.pool = new Pool().init();

    this._beforeunload_listener = this.dispose.bind(this);
    window.addEventListener("beforeunload", this._beforeunload_listener);

    this.loop = new Loop();
    this.loop.framelimit = this.config.routine_dt;
    this.loop.step = this.routine.bind(this);

    this.playerlocal = new NetPlayer(true);

    return this;
  }

  /**
   * @param {string} to .
   */
  _on_connected(to) {
    this._send_greet(to);
    this.players_count += 1;
  }

  /**
   * @param {string} id .
   */
  _on_disconnected(id) {
    const player = this.players[id];
    delete this.players[id];
    this._send_neighbors();
    this.players_count -= 1;
  }

  run(callback) {
    this.netlib.on("signalingerror", logger.error.bind(logger));
    this.netlib.on("rtcerror", logger.error.bind(logger));

    this.loop.run().start();

    this.netlib.on("ready", () => {
      this.netlib.list().then((lobbies) => {
        // join available
        for (const i in lobbies) {
          const l = lobbies[i];
          if (l.playerCount < this.config.max_players) {
            this.netlib.once("lobby", (code) => {
              logger.log(`Network: connected to lobby: ${code}`);
            });
            this.netlib.join(l.code);
            return;
          }
        }

        // or create new one
        this._create_lobby();
      });

      this.netlib.on("message", this._on_message.bind(this));
      this.netlib.on("connected", (peer) => {
        logger.log(`Network: new peer connected: ${peer.id}`);
        this._on_connected(peer.id);
        //this.netlib.broadcast("reliable", `Hi. I'm new peer`);
      });
      this.netlib.on("disconnected", (peer, lobby) => {
        logger.log(
          `Network: ${peer.id} disconnected, their latency was ${peer.latency.average}`,
        );
        this._on_disconnected(peer.id);
      });
      this.netlib.on("lobby", (code, lobby) => {
        this._on_lobby(code, lobby);
				if (callback) {
					callback();
				}
      });
    });

    return this;
  }

  _on_lobby(code, lobby) {
    this.playerlocal.id = this.netlib.id;
    const player = (this.players[this.playerlocal.id] = this.playerlocal);
    this.connected = true;
    this.players_count += 1;

    if (lobby.leader != this.netlib.id) {
      return;
    }

    player.creator = true;
  }

  _create_lobby() {
    logger.log(`Network: creating new lobby..`);
    this.netlib.once("lobby", (code) => {
      logger.log(`Network: lobby was created: ${code}`);
    });
    this.netlib.create({ public: true });
  }

  dispose() {
    this.netlib?.close();
    this.netlib = null;
    this.loop?.stop();
    this.loop = null;
    this.playerlocal = null;
    this.players = {};
    this.pool.dispose();
    window.removeEventListener("beforeunload", this._beforeunload_listener);
    this._beforeunload_listener = null;
    logger.log(`Network: network closed`);
  }
}

export {
  MESSAGE_TYPE,
  MESSAGE_GAME_ACTION_TYPE,
  MESSAGE_ENTITY_UPDATE_TYPE,
  NET_PACKET_SIZE,
  Network,
  NetPacket,
};
export default Network;
