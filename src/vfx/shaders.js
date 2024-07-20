import * as THREE from "three";
import MaterialBlobAfs from "./vfx_material_blob_a.fs?raw";
import Simplestvs from "./simplest.vs?raw";
import App from "../app.js";

let time_uniform = { value: 0 }
let material_blob_instance = null;

export function update_shaders() {
	time_uniform.value = App.instance.session.elapsed;
}

export function get_material_blob_a(texture_noise) {
	if (!material_blob_instance) {
		material_blob_instance = new THREE.ShaderMaterial({
			vertexShader: Simplestvs,
			fragmentShader: MaterialBlobAfs,
			uniforms: {
				noise0: {  value: texture_noise },
				time: time_uniform
			},
		});
	}

	return material_blob_instance;
}
