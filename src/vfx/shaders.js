import * as THREE from "three";
import MaterialBlobAfs from "./vfx_material_blob_a.fs?raw";
import Simplestvs from "./simplest.vs?raw";
import App from "../app.js";
import { time_uniform } from "./time_uniform.js";

let material_blob_instance = null;
let material_hza_instances = {};

export function update_shaders() {
  time_uniform.value = App.instance.session.elapsed;
}

export function get_material_blob_a(texture_noise, blob_size = 10, wave_scale = 0.2) {
  if (!material_blob_instance) {
    material_blob_instance = new THREE.ShaderMaterial({
      vertexShader: Simplestvs,
      fragmentShader: MaterialBlobAfs,
      uniforms: {
        noise0: { value: texture_noise },
        blob_size: { value: blob_size },
				wave_scale: { value: wave_scale },
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
      if (opts[k][kk]) {
        continue;
      }
      opts[k][kk] = matopts[kk];
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
  const _props = Object.values(opts_default).reduce((accumulator, extensionProps) => ({
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
