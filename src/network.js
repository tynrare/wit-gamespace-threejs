import { Peer, Network as Netlib } from "@poki/netlib";
import logger from "./logger.js";
import Loop from "./loop.js";
import { Pool } from "./entity.js";

const fakenames = ["Bob", "Glob", "Dog", "Borg", "Dong", "Clomp"];

const MESSAGE_TYPE = {
  GREET: 0,
  SYNC: 1,
  NEIGHBORS: 2,
  GAME: 3,
  ASK_ENTITIES: 4,
  RESPONSE_ENTITIES: 5,
  ASK_ENTITY: 6,
  RESPONSE_ENTITY: 7,
};

const MESSAGE_GAME_ACTION_TYPE = {
  POSITION: 0,
  POSITION_FORCED: 1,
  GATHER: 2,
};

const NET_PACKET_SIZE = {
  BASIC: 0,
  LARGE: 1,
  EXTRA_LARGE: 2,
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

  static size_by_type(type) {
    switch (type) {
      case MESSAGE_TYPE.RESPONSE_ENTITIES:
        return NET_PACKET_SIZE.LARGE;
      default:
        return NET_PACKET_SIZE.BASIC;
    }
  }
}

NetPacket.infos_length = {};
NetPacket.infos_length[NET_PACKET_SIZE.BASIC] = 8;
NetPacket.infos_length[NET_PACKET_SIZE.LARGE] = 16;
NetPacket.infos_length[NET_PACKET_SIZE.EXTRA_LARGE] = 64;

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
    this.alatency = 0;

    this.creator = false;
    this.local = local;

    this.entities_count = 0;
    this.guids = 0;

    this.neighbors = [];
    this.blames = [];

    this.packet = new NetPacket();
    this.packet_large = new NetPacket(NET_PACKET_SIZE.LARGE);
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

    /** @type {Object<string, NetPlayer>} */
    this.players = {};

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

      switch (parseInt(args[1])) {
        case MESSAGE_TYPE.GREET:
          player = this.players[peer.id] = new NetPlayer(
            false,
            args[2],
            peer.id,
          );
          break;
        case MESSAGE_TYPE.NEIGHBORS:
          player.neighbors.length = 0;
          const newneighbors = args[2].split(";");
          for (const i in newneighbors) {
            const n = newneighbors[i];
            if (!n.length) {
              continue;
            }
            player.neighbors.push(n);
          }
          break;
      }
    } else if (player) {
      const p = player.packet_large;
      p.copy(data);

      player.alatency = peer.latency.average;

      switch (p.type) {
        case MESSAGE_TYPE.SYNC:
          player.stamp = p.stamp;
          player.entities_count = p.tags[0];
          player.guids = p.tags[1];
          player.sent = Math.max(p.index, player.sent);
          for (let i in player.neighbors) {
            player.blames[i] = p.info_short[i];
          }
          break;
        default: {
          const packet = new NetPacket(
            NetPacket.size_by_type(p.type),
            peer.latency.last,
          );
          packet.copy(data);
          player.query.push(packet);
          break;
        }
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

  _send_welcome(to) {
    let msg = `s,${MESSAGE_TYPE.GREET},${this.playerlocal.name}`;
    this.netlib.send("reliable", to, msg);
    this._send_neighbors();
  }

  /**
   * @param {string} to .
   */
  _on_connected(to) {
    this._send_welcome(to);
  }

  /**
   * @param {string} to .
   */
  _on_disconnected(to) {
    delete this.players[to];
    this._send_neighbors();
  }

  _send_sync() {
    const p = this.playerlocal.packet;

    p.type = MESSAGE_TYPE.SYNC;
    p.stamp = this.playerlocal.stamp;
    p.index = this.playerlocal.sent++;
    p.tags[0] = this.playerlocal.entities_count;
    p.tags[1] = this.playerlocal.guids;

    for (const i in this.playerlocal.blames) {
      p.info_short[i] = this.playerlocal.blames[i];
    }

    this.netlib.broadcast("unreliable", p.buffer);
  }

  routine(dt) {
    if (!this.connected) {
      return;
    }

    this.playerlocal.stamp += dt / this.config.routine_dt;
    this.playerlocal.entities_count = this.pool.allocated;
    this.playerlocal.guids = this.pool.guids;

		this.playerlocal.blames.length = this.playerlocal.neighbors.length;
    for (const i in this.playerlocal.neighbors) {
      const id = this.playerlocal.neighbors[i];
      const player = this.players[id];
      let blame = 0;
      if (
        this.playerlocal.entities_count != player.entities_count &&
        this.playerlocal.guids < player.guids
      ) {
        blame = 1;
      }

			this.playerlocal.blames[i] = blame;
    }

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


  run() {
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
        this.playerlocal.id = this.netlib.id;
        this.players[this.playerlocal.id] = this.playerlocal;
        this.connected = true;

        if (lobby.leader == this.netlib.id) {
          this.playerlocal.creator = true;
        }
      });
    });

    return this;
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
  NET_PACKET_SIZE,
  Network,
  NetPacket,
};
export default Network;
