import { PawnBehaviourBowlingAConfig_t } from "./pawn_behaviour_bowling.js";
import { ProjectileBallBowlingConfig_t } from "./projectile_ball_bowling.js";
import { OverlayUiBowlingConfig_t } from "./overlay_ui_bowling.js";
import Stats from "../../stats";

const ConfigBowlingGeneric = {
    zoom_on_aim: true
}


/** @type ConfigBowlingGeneric */
const ConfigBowlingGeneric_t = Object.setPrototypeOf({}, ConfigBowlingGeneric);

class ConfigBowling {
    constructor() {
        this.confignames = ["generic", "pawn_behabiour", "projectile", "overlay"];
        /** @type ConfigBowlingGeneric */
        this.generic = Object.setPrototypeOf({}, ConfigBowlingGeneric_t);
        this.pawn_behabiour = PawnBehaviourBowlingAConfig_t;
        this.projectile = ProjectileBallBowlingConfig_t;
        this.overlay = OverlayUiBowlingConfig_t;
    }

    run() {
        Stats.instance.link_config_save(this.save.bind(this));
        this.load();
        this._print();
    }

    _print() {
        Stats.instance.config_el.innerHTML = "";
        const register_input = (obj, key, input) => {
            input.onchange = () => {
                if (input.type === "checkbox") {
                    obj[key] = input.checked;
                } else {
                    obj[key] = this._parse_value(input.value);
                }
                console.log(obj[key]);
            }
        }
        for (const confname of this.confignames) {
            const sep = document.createElement("sep");
            sep.innerHTML = confname;
            Stats.instance.config_el.appendChild(sep);

            const conf = this[confname];
            for (const k in conf) {
                const entry = document.createElement("entry");
                const label = document.createElement("label");
                /** @type HTMLInputElement */
                const input = document.createElement("input");
                entry.appendChild(label);
                entry.appendChild(input);
                Stats.instance.config_el.appendChild(entry);

                label.innerHTML = k;

                switch (typeof conf[k]) {
                    case "boolean":
                        input.type = "checkbox";
                        input.checked = conf[k];
                        break;
                    case "number":
                        input.type = "number";
                        input.value = conf[k];
                        break;
                    case "string":
                        input.type = "text";
                        input.value = conf[k];
                        break;
                }

                register_input(conf, k, input);
            }
        }
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

        for (const confname of this.confignames) {
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

        for (const confname of this.confignames) {
            const conf = this[confname];
            for (const k in conf) {
                const val = urlParams.get(`${confname}.${k}`);
                const v = this._parse_value(val);
                if (v !== null) {
                    conf[k] = v;
                }
            }
        }
    }

    _parse_value(val) {
        if (val === null || val === "null") {
            return null;
        } else if (val === "false") {
            return false;
        } else if (val === "true") {
            return true;
        } else {
            const num = parseFloat(val);
            if (!isNaN(num)) {
                return num;
            } else {
                return val;
            }
        }
    }
}

export default ConfigBowling;