import { Peer, Network as Netlib } from "@poki/netlib";
import logger from "./logger.js";
import Loop from "./loop.js";

const fakenames = ["Bob", "Glob", "Dog", "Borg", "Dong", "Clomp"];

const MESSAGE_TYPE = {
  GREET: 0,
  SYNC: 1,
  GAME: 2,
};

const MESSAGE_GAME_ACTION_TYPE = {
  POSITION: 0,
  POSITION_FORCED: 1,
};

class NetPacket {
  constructor(latency = 0) {
    this.latency = 0;

    const buffer = new ArrayBuffer(16);
    this.buffer = buffer;
    this._vtype = new Uint8Array(buffer, 0, 1);
    this._vsubtype = new Uint8Array(buffer, 1, 1);
    this._vstamp = new Uint16Array(buffer, 2, 1);
    this.pos = new Float32Array(buffer, 4, 3);
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

  copy(buffer) {
    this._len.set(new Uint8Array(buffer));

    return this;
  }
}

class NetPlayer {
  /**
   * @param {string?} [name] .
   * @param {sting?} [id] .
   */
  constructor(local = false, name = null, id = "") {
    this.name = name ?? fakenames[Math.floor(Math.random() * fakenames.length)];
    this.stamp = 0;
    this.id = id ?? "";
    this.local = local;
    this.alatency = 0;

    this.packet = new NetPacket();
    /** @type {Array<NetPacket>} */
    this.query = [];
  }

  tostring() {
    const latency = this.alatency.toFixed(0).padStart(3, "0");
    const title = this.local ? "(  You  )" : "(" + latency + "ms)";
    const id = this.id.substr(-5);
    const stamp = this.stamp.toString().padStart(4, "0");
    return `${stamp} | ${title} ${this.name} #${id}`;
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
      }
    } else if (player) {
      const p = player.packet;
      p.copy(data);

      player.alatency = peer.latency.average;

      switch (p.type) {
        case MESSAGE_TYPE.SYNC:
          player.stamp = p.stamp;
          break;
        case MESSAGE_TYPE.GAME:
          player.query.push(new NetPacket(peer.latency.last).copy(data));
          break;
      }
    }
  }

  /**
   * @param {string} to .
   */
  _on_connected(to) {
    this._send_welcome(to);
  }

  _send_welcome(to) {
    const msg = `s,${MESSAGE_TYPE.GREET},${this.playerlocal.name}`;
    this.netlib.send("reliable", to, msg);
  }

  _send_sync() {
    const p = this.playerlocal.packet;
    p.type = MESSAGE_TYPE.SYNC;
    p.stamp = this.playerlocal.stamp;
    this.netlib.broadcast("unreliable", p.buffer);
  }

  /**
   * @param {MESSAGE_GAME_ACTION_TYPE} type .
   */
  send_game_action_pos(type, x, y, z) {
    const p = this.playerlocal.packet;
    p.type = MESSAGE_TYPE.GAME;
    p.stamp = this.playerlocal.stamp;
    p.subtype = type;
    p.pos[0] = x;
    p.pos[1] = y;
    p.pos[2] = z;

    this.netlib.broadcast("reliable", p.buffer);
  }

  /**
   * @param {string} to .
   */
  _on_disconnected(to) {
    delete this.players[to];
  }

  init() {
    this.netlib = new Netlib(this.uuid);

    this._beforeunload_listener = this.dispose.bind(this);
    window.addEventListener("beforeunload", this._beforeunload_listener);

    this.loop = new Loop();
    this.loop.framelimit = this.config.routine_dt;
    this.loop.step = this.routine.bind(this);

    this.playerlocal = new NetPlayer(true);

    return this;
  }

  routine(dt) {
    if (!this.connected) {
      return;
    }

    this.playerlocal.stamp += dt / this.config.routine_dt;
    this._send_sync();
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
      this.netlib.on("disconnected", (peer) => {
        logger.log(
          `Network: ${peer.id} disconnected, their latency was ${peer.latency.average}`,
        );
        this._on_disconnected(peer.id);
      });
      this.netlib.once("lobby", (code) => {
        this.playerlocal.id = this.netlib.id;
        this.players[this.playerlocal.id] = this.playerlocal;
        this.connected = true;
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
    window.removeEventListener("beforeunload", this._beforeunload_listener);
    this._beforeunload_listener = null;
    logger.log(`Network: network closed`);
  }
}

export { MESSAGE_GAME_ACTION_TYPE, Network };
export default Network;
