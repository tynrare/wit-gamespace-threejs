/** @namespace Pages/Tests */
import PageBase from "../page_base.js";
import Network from "../network.js";
import { Pool, Entity } from "../entity.js"

const MESSAGE_TYPE = {
    GREET: 0,
    ASK_ENTRANCE: 1,
    ENTITY: 2
};

class Datawork {
    constructor() {
        /** @type {Pool} */
        this.pool = null;
    }

    run() {
        this.pool = new Pool().init()

        return this;
    }

    /**
     * @param {Uint8Array} content copies content from array if provided
     */
    allocate(content = null) {
        const entity = this.pool.allocate();
        if (content) {
            const refentity = new Entity(
                entity.id,
                entity.index,
                null,
                content.buffer,
                content.byteOffset,
            );
            entity.copy(refentity);
        }

        return entity;
    }

    stop() {
        this.pool.dispose();
        this.pool = null;
    }
}

/**
 * @class PageTestcase6Network
 * @memberof Pages/Tests
 */
class PageTestcase6Network extends PageBase {
    constructor() {
        super();
        /** @type {Network} */
        this.network = null;
        /** @type {Datawork} */
        this.datawork = null;
    }

    /**
     * 
     * @param {string} peerid .
     * @param {number} type message type id
     * @param {Uint8Array} data packet data 
     */
    recieve(peerid, type, data) {
        switch (type) {
            case MESSAGE_TYPE.ASK_ENTRANCE: {
                network.send(MESSAGE_TYPE.GREET, null, peerid);
                break;
            }
            case MESSAGE_TYPE.GREET: {
                break;
            }
            case MESSAGE_TYPE.ENTITY: {
                break;
            }
        }
    }

    /**
     * Called when new peer connected
     * 
     * @param {string} peerid 
     */
    greet(peerid) {

    }

    /**
     * Called when current instance is an a host (creator)
     */
    create() {

    }

    connected(initial) {
        if (initial) {
            this.create();
        } else {
            this.network.send(MESSAGE_TYPE.ASK_ENTRANCE, null);
        }
    }

    run() {
        this.datawork = new Datawork().run();

        this.network = new Network().init();
        this.network.recieve = this.recieve.bind(this);
        this.network.greet = this.greet.bind(this);
        this.network.run(this.connected.bind(this));
    }

    step(dt) {

    }

    stop() {
        this.network.dispose();
        this.network = null;
        this.datawork.stop();
        this.datawork = null;
    }
}

export default PageTestcase6Network;