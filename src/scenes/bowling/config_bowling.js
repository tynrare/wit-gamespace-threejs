import { PawnBehaviourBowlingAConfig_t } from "./pawn_behaviour_bowling";
import Stats from "../../stats";

const ConfigBowlingGeneric = {
    zoom_on_aim: true
}

/** @type ConfigBowlingGeneric */
const ConfigBowlingGeneric_t = Object.setPrototypeOf({}, ConfigBowlingGeneric);


class ConfigBowling {
    constructor() {
        /** @type ConfigBowlingGeneric */
        this.generic = Object.setPrototypeOf({}, ConfigBowlingGeneric_t);
    }

    run() {
        Stats.instance.link_config_save(this.save.bind(this));
        this.load();
    }

    save() {
        const hash = window.location.hash;
        let query = "";
        let name = hash.substring(1);
        const query_index = hash.indexOf("?");
        if (query_index >= 0) {
            query = hash.substring(query_index);
            name = hash.substring(1, query_index);
        }

        const urlParams = new URLSearchParams(query);

        for (const confname of ["generic"]) {
            const conf = this[confname];
            for (const k in conf) {
                if (!conf.hasOwnProperty(k)) {
                    continue;
                }

                urlParams.set(`${confname}.${k}`, conf[k]);
            }
        }

        const urlParamsString = urlParams.toString();
        let newloc = window.location.toString();
        if (query != urlParamsString) {
            newloc = newloc.replace(query, "?" + urlParamsString);
        }
        navigator.clipboard.writeText(newloc).catch((e) => console.error(e));
        Stats.instance.print(newloc);
    }

    load() {
        const hash = window.location.hash;
        let query = "";
        let name = hash.substring(1);
        const query_index = hash.indexOf("?");
        if (query_index >= 0) {
            query = hash.substring(query_index);
            name = hash.substring(1, query_index);
        }

        const urlParams = new URLSearchParams(query);

        for (const confname of ["generic"]) {
            const conf = this[confname];
            for (const k in conf) {
                const val = urlParams.get(`${confname}.${k}`);
                if (val === null) {
                    continue;
                } else if (val === "false") {
                    conf[k] = false;
                } else if (val === "true") {
                    conf[k] = true;
                } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                        conf[k] = num;
                    } else {
                        conf[k] = val;
                    }
                }

                console.log(conf[k]);
            }
        }
    }
}

export default ConfigBowling;