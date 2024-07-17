import * as THREE from "three";

class RenderUtils {
  create_material0(color) {
    const material = new THREE.MeshPhongMaterial({
      color: color ?? 0xb768e9,
      emissive: 0x4f7e8b,
      shininess: 10,
      specular: 0xffffff,
    });

    return material;
  }

  /**
 * @returns {THREE.Mesh}
 */
  spawn_icosphere0(color) {
    const geometry = new THREE.IcosahedronGeometry(0.1);
    const material = this.create_material0(color);
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
  }
}

export default RenderUtils;