import { Peer, Network as Netlib } from "@poki/netlib";
import logger from "./logger.js";
import Loop from "./loop.js";

const fakenames = ["Bob", "Glob", "Dog", "Borg", "Dong", "Clomp"];

const MESSAGE_TYPE = {
  GREET: 0,
  SYNC: 1,
};

class NetPlayer {
  /**
   * @param {string?} [name] .
   * @param {sting?} [id] .
   */
  constructor(local = false, name = null, id = "") {
    this.name = name ?? fakenames[Math.floor(Math.random() * fakenames.length)];
    this.stepnum = 0;
    this.id = id ?? "";
    this.local = local;
    this.alatency = 0;
  }

  tostring() {
    const latency = this.alatency.toFixed(0).padStart(3, "0");
    const title = this.local ? "(  You  )" : "(" + latency + "ms)";
    const id = this.id.substr(-5);
    const stepnum = this.stepnum.toString().padStart(4, "0");
    return `${stepnum} | ${title} ${this.name} #${id}`;
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
    if (channel === "reliable") {
      logger.log(
        `Network: received '${data}' on channel ${channel} from ${peer.id}`,
      );
    }

    let player = this.players[peer.id];

    if (data[0] === "s") {
      const args = data.split(",");

      switch (parseInt(args[1])) {
        case MESSAGE_TYPE.GREET:
          player = this.players[peer.id] = new NetPlayer(
            false,
            args[2],
            peer.id,
          );
          break;
        case MESSAGE_TYPE.SYNC:
          player.alatency = peer.latency.average;
					player.stepnum = parseInt(args[2]);
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
    const msg = `s,${MESSAGE_TYPE.SYNC},${this.playerlocal.stepnum}`;
    this.netlib.broadcast("unreliable", msg);
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

    this.playerlocal.stepnum += dt / this.config.routine_dt;
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

export default Network;
