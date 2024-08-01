import { Network as Netlib } from "@poki/netlib";
import logger from "./logger.js";
import Loop from "./loop.js";

const MESSAGE_TYPE = {
	SYNC: 0
}

class Network {
  constructor() {
    /** @type {Netlib} */
    this.netlib = null;

    this.uuid = "0cedcf29-999d-4d80-864a-a38caa98182e";

    this.config = {
      max_players: 8,
			routine_dt: 100
    };

		/** @type {Loop} */
		this.loop = null;

		this.stepnum = 0;
  }

  init() {
    this.netlib = new Netlib(this.uuid);

    this._beforeunload_listener = this.dispose.bind(this);
    window.addEventListener("beforeunload", this._beforeunload_listener);

		this.loop = new Loop();
		this.loop.framelimit = this.config.routine_dt;
		this.loop.step = this.routine.bind(this);

		this.stepnum = 0;

    return this;
  }

	routine(dt) {
		this.stepnum += dt / this.config.routine_dt;
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

      this.netlib.on("message", (peer, channel, data) => {
        logger.log(
          `Network: received '${data}' on channel ${channel} from ${peer.id}`,
        );
      });
      this.netlib.on("connected", (peer) => {
        logger.log(`Network: new peer connected: ${peer.id}`);
        this.netlib.send("reliable", peer.id, "hi.");
        //this.netlib.broadcast("reliable", `Hi. I'm new peer`);
      });
      this.netlib.on("disconnected", (peer) => {
        logger.log(
          `Network: ${peer.id} disconnected, their latency was ${peer.latency.average}`,
        );
      });
			this.netlib.once("lobby", (code) => {
				// ..
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
    window.removeEventListener("beforeunload", this._beforeunload_listener);
    this._beforeunload_listener = null;
    logger.log(`Network: network closed`);
  }
}

export default Network;
