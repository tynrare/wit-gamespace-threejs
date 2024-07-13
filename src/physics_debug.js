import * as THREE from "three";
import { oimo } from "./lib/OimoPhysics.js";

export default class DebugDraw extends oimo.dynamics.common.DebugDraw {
    constructor(scene) {
        super();
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            vertexColors: true
        });
        const geometry = new THREE.BufferGeometry();
        this.lines = new THREE.LineSegments(geometry, lineMaterial);
        scene.add(this.lines);

        this.linePositions = [];
        this.lineColors = [];
    }

    begin() {
        this.linePositions = [];
        this.lineColors = [];
    }

    line(from, to, color) {
        this.linePositions.push(from.x);
        this.linePositions.push(from.y);
        this.linePositions.push(from.z);
        this.linePositions.push(to.x);
        this.linePositions.push(to.y);
        this.linePositions.push(to.z);

        this.lineColors.push(color.x);
        this.lineColors.push(color.y);
        this.lineColors.push(color.z);
        this.lineColors.push(1);
        this.lineColors.push(color.x);
        this.lineColors.push(color.y);
        this.lineColors.push(color.z);
        this.lineColors.push(1);
    }

    end() {
        this.lines.geometry.setAttribute("position",
            new THREE.BufferAttribute(new Float32Array(this.linePositions), 3));
        this.lines.geometry.setAttribute("color",
            new THREE.BufferAttribute(new Float32Array(this.lineColors), 4));
    }
}
