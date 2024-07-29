import * as THREE from "three";

class RenderUtils {
	constructor() {
		/** @type {Object<number, THREE.MeshPhongMaterial} */
		this.material0_instances = {}
	}
	/**
	 * @param {number|THREE.Color} color .
	 */
  create_material0(color) {
		let c = color ?? 0xb768e9;
		if (typeof c !== "number") {
			c = color.getHex();
		}
		let material = this.material0_instances[c];
		if (!material) {
			material = new THREE.MeshPhongMaterial({
				color: c,
				emissive: 0x4f7e8b,
				shininess: 10,
				specular: 0xffffff,
			});
			this.material0_instances[c] = material;
		}

    return material;
  }

  /**
 * @returns {THREE.Mesh}
 */
  spawn_icosphere0(color, size = 0.1) {
    const geometry = new THREE.IcosahedronGeometry(size);
    const material = this.create_material0(color);
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
  }
}

export default RenderUtils;
