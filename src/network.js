import { Network as Netlib, Peer } from "@poki/netlib";

class NetPacket {
  constructor(datalen = 2) {
    const dl = datalen + 2;
    this.buffer = new ArrayBuffer(dl, { maxByteLength: Math.max(dl, 256) });
    this._vtype = new Uint8Array(this.buffer, 0, 2);
    this._vcontent = new Uint8Array(this.buffer, 2, datalen);
    this._len = new Uint8Array(this.buffer, 0, dl);
  }

	set_content(data) {
		this.buffer.resize(data.byteLength + 2);
    this._vcontent = new Uint8Array(this.buffer, 2, data.byteLength);
		this._vcontent.set(new Uint8Array(data));
    this._len = new Uint8Array(this.buffer, 0, data.byteLength + 2);
	}

	copy(data) {
		this.buffer.resize(data.byteLength);
    this._vcontent = new Uint8Array(this.buffer, 2, data.byteLength - 2);
    this._len = new Uint8Array(this.buffer, 0, data.byteLength);
		this._len.set(new Uint8Array(data));
	}

  get type() {
    return this._vtype[0];
  }

  set type(val) {
    return (this._vtype[0] = val);
  }

  get content() {
    return this._vcontent;
  }
}

class Network {
  constructor(uuid) {
    /** @type {Netlib} */
    this.netlib = null;
    this.uuid = uuid ?? "942b648e-aefd-467f-ba8b-4f2c8c4f898a";
		this.packet = new NetPacket();
		/** @type {function(string, number, Uint8Array): void} */
		this.recieve = null;
		/** @type {function(string): Uint8Array} */
		this.greet = null;
  }

  /**
   * @param {number} type
   * @param {number|null|ArrayBuffer} data
   * @param {string?} [to]
   */
  send(type, data, to) {
		this.packet.type = type;
		if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
			this.packet.set_content(data);
		} else {
			this.packet.set_content(new Uint8Array(2));
			this.packet._vcontent[0] = data;
		}

		const buffer = this.packet.buffer.slice();

		if (to) {
			this.netlib.send("reliable", to, buffer);
		} else {
			this.netlib.broadcast("reliable", buffer);
		}
	}

  /**
   * @param {Peer} peer .
   * @param {string} channel .
   * @param {string} data .
   */
  _on_message(peer, channel, data) {
		this.packet.copy(data);
		if (this.recieve) {
			this.recieve(peer.id, this.packet.type, this.packet.content);
		}
	}

  init() {
    this.netlib = new Netlib(this.uuid);
		//console.log(this.netlib);

    this._beforeunload_listener = this.dispose.bind(this);
    window.addEventListener("beforeunload", this._beforeunload_listener);

    return this;
  }

  run(callback) {
    this.netlib.on("signalingerror", console.error.bind(console));
    this.netlib.on("rtcerror", console.error.bind(console));

    this.netlib.on("ready", () => {
      this.netlib.list().then((lobbies) => {
        // join available
        for (const i in lobbies) {
          const l = lobbies[i];
          if (l.playerCount < 16) {
            this.netlib.once("lobby", (code) => {
              console.log(`Network: connected to lobby: ${code}`);
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
        console.log(`Network: new peer connected: ${peer.id}`);
        this._on_connected(peer.id);
      });
      this.netlib.on("disconnected", (peer, lobby) => {
        console.log(
          `Network: ${peer.id} disconnected, their latency was ${peer.latency.average}`,
        );
        this._on_disconnected(peer.id);
      });
      this.netlib.on("lobby", (code, lobby) => {
        this._on_lobby(code, lobby);
        if (callback) {
          callback(this.netlib.currentLeader == this.netlib.id);
        }
      });
    });

    return this;
  }

  _on_lobby(code, lobby) {
    if (lobby.leader != this.netlib.id) {
      return;
    }
  }

  _create_lobby() {
    console.log(`Network: creating new lobby..`);
    this.netlib.once("lobby", (code) => {
      console.log(`Network: lobby was created: ${code}`);
    });
    this.netlib.create({ public: true });
  }

  /**
   * @param {string} id .
   */
  _on_disconnected(id) {}

  /**
   * @param {string} peerid .
   */
  _on_connected(peerid) {
		if (this.greet) {
			this.greet(peerid);
		}
	}

  dispose() {
    this.netlib?.close();
    this.netlib = null;
  }
}

export default Network;
