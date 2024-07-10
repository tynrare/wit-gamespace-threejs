import * as THREE from "three";
import Loader from "../loader.js";

export function createFloorPlane(index = 0, pixelate = false) {
  const repeats = 64;
  const geometry = new THREE.PlaneGeometry(repeats * 8, repeats * 8);
  const texture = Loader.instance.get_texture(`tex${index}.png`, pixelate);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeats, repeats);
  const material = new THREE.MeshToonMaterial({
    map: texture,
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.position.z -= 2;
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;

	return plane;
}
