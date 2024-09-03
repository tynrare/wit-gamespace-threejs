import * as THREE from "three";
import MaterialBlobAfs from "./vfx_material_blob_a.fs?raw";
import Simplestvs from "./simplest.vs?raw";
import App from "../app.js";
import { time_uniform } from "./time_uniform.js";

let material_blob_instance = null;
let material_hza_instances = {};

export function update_shaders() {
  time_uniform.value = App.instance.session.elapsed;
	for (const k in material_hza_instances) {
		const m = material_hza_instances[k];
		m.noiseTime = App.instance.session.elapsed * 1e-3;
	}
}

/**
 * @param {Object} [opts] .
 * @param {number} [opts.blob_size=10] .
 * @param {number} [opts.wave_scale=0.2] .
 */
export function get_material_blob_a(texture_noise, opts) {
  if (!material_blob_instance) {
		const props = {
			blob_size: opts?.blob_size ?? 10,
			wave_scale: opts?.wave_scale ?? 0.2
		}
		material_blob_instance = new THREE.ShaderMaterial({
			vertexShader: Simplestvs,
			fragmentShader: MaterialBlobAfs,
			uniforms: {
				noise0: { value: texture_noise },
				blob_size: { value: props.blob_size },
				wave_scale: { value: props.wave_scale },
				time: time_uniform,
			},
		});
  }

  return material_blob_instance;
}

import { DitheredOpacity } from "./DitheredOpacity.js";
import { RimGlow } from "./RimGlow.js";
import { Noise as NoiseDisplace } from "./Noise.js";
import { ExtendedMaterial } from "./ExtendedMaterial.js";

export function get_material_hza(opts = {}, instance_id = 0) {
  if (material_hza_instances[instance_id]) {
    return material_hza_instances[instance_id];
  }

  const extensions = {
    dither: "dither" in opts && opts.dither !== false,
    glow: "glow" in opts && opts.glow !== false,
    noise: "noise" in opts && opts.noise !== false,
  };

  const opts_default = {
    dither: {
      opacity: 0.5,
    },
    glow: {
      glowIntensity: 1.0,
      glowColor: { r: 0, g: 1, b: 0.6 },
      glowPower: 1.0,
    },
    noise: {},
  };

  for (const k in opts_default) {
    const matopts = opts_default[k];
    if (typeof opts[k] != "object") {
      opts[k] = {};
    }

    for (const kk in matopts) {
      if (!opts[k][kk]) {
				opts[k][kk] = matopts[kk];
      }
    }
  }

  const extensionObjects = {
    dither: DitheredOpacity,
    glow: RimGlow,
    noise: NoiseDisplace,
  };

  const _extensions = Object.keys(extensions)
    .filter((e) => !!extensions[e])
    .map((e) => extensionObjects[e]);
  const _props = Object.values(opts).reduce((accumulator, extensionProps) => ({
    ...accumulator,
    ...extensionProps,
  }));

  const material = new ExtendedMaterial(
    THREE.MeshStandardMaterial,
    _extensions,
    _props,
  );

  material_hza_instances[instance_id] = material;

  return material;
}

export { DitheredOpacity, RimGlow, NoiseDisplace, ExtendedMaterial };
