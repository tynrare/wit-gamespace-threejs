/** @namespace Gamespace */
import * as THREE from "three";
import {
  clamp,
  project_on_plane,
  triangle_normal,
  get_barycentric_coordinates,
  barycentric_to_cartesian,
  project_line_on_line,
  project_on_line_clamp,
  cache as mathcache,
} from "../../math.js";

class Vertex {
  constructor(x, y, z, r = 1, g = 1, b = 1) {
    this.pos = new THREE.Vector3(x, y, z);
    this.color = mathcache.color0.set(r ?? 1, g ?? 1, b ?? 1).getHex();
  }
}

class Edge {
  /**
   * @param {string} id .
   * @param {Vertex} a .
   * @param {Vertex} b .
   */
  constructor(id, a, b) {
    this.id = id;
    this.a = a;
    this.b = b;
    /** @type {Face} */
    this.left = null;
    /** @type {Face} */
    this.right = null;

    this.length = a.pos.distanceTo(b.pos);

    /**
     * (alt option:) Equals WHITE if no vertex color set or if vertex colors differs
     * @type {number} .
     */
    this.color = (this.a.color + this.b.color) / 2;
  }

  /**
   * @param {Vertex} v .
   */
  has(v) {
    return this.a == v || this.b == v;
  }

  /**
   * @param {Face} face .
   */
  add(face) {
    if (!this.left) {
      this.left = face;
    } else if (!this.right) {
      this.right = face;
    } else {
      throw new Error("Edge::add error. Edge already has two faces");
    }
  }

  /**
   * @param {Face} face .
   */
  other(face) {
    if (this.left == face) {
      return this.right;
    }
    if (this.right == face) {
      return this.left;
    }
  }

  dispose() {
    this.left = null;
    this.right = null;
    this.a = null;
    this.b = null;
  }
}

class Face {
  /**
   * @param {string} id .
   * @param {Vertex} pa .
   * @param {Vertex} pb .
   * @param {Vertex} pc .
   * @param {Edge} ea .
   * @param {Edge} eb .
   * @param {Edge} ec .
   */
  constructor(id, pa, pb, pc, ea, eb, ec) {
    this.id = id;
    this.pa = pa;
    this.pb = pb;
    this.pc = pc;
    this.ea = ea;
    this.eb = eb;
    this.ec = ec;

    this.ea.add(this);
    this.eb.add(this);
    this.ec.add(this);

    this.normal = new THREE.Vector3().copy(
      triangle_normal(pa.pos, pb.pos, pc.pos),
    );

    /**
     * (alt option:) Equals WHITE if no vertex color set or if vertex colors differs
     * @type {number} .
     */
    this.color = (this.ea.color + this.eb.color + this.ec.color) / 3;
  }

  /**
   * @param {Vertex} v .
   */
  find_opposide_edge(v) {
    if (!this.ea.has(v)) {
      return this.ea;
    }
    if (!this.eb.has(v)) {
      return this.eb;
    }
    if (!this.ec.has(v)) {
      return this.ec;
    }
  }

  dispose() {
    this.ea.dispose();
    this.eb.dispose();
    this.eb.dispose();
    this.ea = null;
    this.eb = null;
    this.ec = null;
    this.pa = null;
    this.pb = null;
    this.pc = null;
  }
}

class NavmeshPoint {
  /**
   * @param {string} id .
   * @param {THREE.Vector3} worldpos .
   * @param {THREE.Vector3} bcpos .
   * @param {Face} face .
   */
  constructor(id, worldpos, bcpos, face) {
    this.worldpos = new THREE.Vector3().copy(worldpos);
    this.bcpos = new THREE.Vector3().copy(bcpos);
    this.id = id;
    this.face = face;
    this.mask = 0xffffff;
  }
}

class Navmesh {
  constructor() {
    /** @type {Object<number, Vertex>} */
    this.verticies = {};
    /** @type {Object<string, Edge>} */
    this.edges = {};
    /** @type {Object<string, Face>} */
    this.faces = {};

    /**
     * Registered navigation points
     *
     * @type {Object<string, NavmeshPoint>}
     */
    this.points = {};

    this.guids = 0;

    this.cache = {
      v3: new THREE.Vector3(),
      v3_0: new THREE.Vector3(),
      vecnames_to_facenames: {
        x: "pa",
        y: "pb",
        z: "pc",
      },
      tested_edges: {},
    };
  }

  /**
   * Base hash value. Unordered
   *
   * @param {number} a
   * @param {number} b
   * @param {number} [c]
   * @returns {number} .
   */
  _fhash(a, b, c = 1.1) {
    const hash =
      a + b + c + Math.log(Math.abs((a || 1.1) * (b || 1.1) * (c || 1.1)) + 1);
    return hash;
  }

  /**
   * Base hash value. Ordered
   *
   * @param {number} a
   * @param {number} b
   * @param {number} [c]
   * @returns {number} .
   */
  _fohash(a, b, c = 1.1) {
		const aa = ((a || 1.1) + 1.1) * 100;
		const bb = ((b || 1.1) + 1.1) * 10;
		const cc = ((c || 1.1) + 1.1) * 1;
    const hash = aa - bb - cc +
      Math.log(Math.abs(aa / bb / cc) + 1);
    return hash;
  }

  /**
   * Default has value
   *
   * @param {number} a
   * @param {number} b
   * @param {number} [c]
   * @returns {number} .
   */
  _hash(a, b, c = 1.1) {
    return Math.round(this._fhash(a, b, c) * 1e10);
  }

  /**
   * hash string
   *
   * @param {number} a
   * @param {number} b
   * @param {number} [c]
   * @returns {string} .
   */
  _shash(a, b, c = 1.1) {
    return "h" + this._hash(a, b, c);
  }

  /**
   * Hash from vectors
   *
   * @param {THREE.Vector3} v1
   * @param {THREE.Vector3} v2
   * @returns {string} .
   */
  _svechash(v1, v2) {
    return this._shash(
      this._fohash(v1.x, v1.y, v1.z),
      this._fohash(v2.x, v2.y, v2.z),
    );
  }

  /**
   * @param {string} id .
   */
  register_copy(id) {
    const ref = this.points[id];
    const point = new NavmeshPoint(
      "p" + this.guids++,
      ref.worldpos,
      ref.bcpos,
      ref.face,
    );
    this.points[point.id] = point;

    return point;
  }

  /**
   * Creates new point on navmesh
   *
   * @param {THREE.Vector3} pos .
   * @returns {NavmeshPoint?} point
   */
  register(pos) {
    for (const k in this.faces) {
      const face = this.faces[k];
      const normal = face.normal;
      const projected_pos = this.cache.v3.copy(
        project_on_plane(pos, face.pa.pos, normal),
      );
      const bcpos = get_barycentric_coordinates(
        face.pa.pos,
        face.pb.pos,
        face.pc.pos,
        projected_pos,
      );
      if (bcpos.x >= 0 && bcpos.y >= 0 && bcpos.z >= 0) {
        const id = "p" + this.guids++;
        const point = new NavmeshPoint(id, projected_pos, bcpos, face);
        this.points[id] = point;

        return point;
      }
    }

    return null;
  }

  /**
   * @param {string} id id of registered point
   * @param {THREE.Vector3} newpos pos that has to be applied
   */
  move(id, newpos, tested_edges = this.cache.tested_edges) {
    const np = this.cache.v3.copy(newpos);
    const p = this.points[id];

    let changed = true;
    let deadlock = 0;

    // iterating faces till correct one is found
    while (changed) {
      const face = p.face;
      const normal = face.normal;

      const projected_pos = this.cache.v3_0.copy(
        project_on_plane(np, face.pa.pos, normal),
      );
      const bcpos = get_barycentric_coordinates(
        face.pa.pos,
        face.pb.pos,
        face.pc.pos,
        projected_pos,
      );

      changed = false;

      // iterating all edges
      // finds out if point outside current triangle.
      // rolls again if it is
      for (const k in this.cache.vecnames_to_facenames) {
        const kn = this.cache.vecnames_to_facenames[k];

        // finding point outside current face
        if (bcpos[k] < 0) {
          const e = face.find_opposide_edge(face[kn]);

          // tests has to be limited, but in some cases
          // (two correction steps inside corners with angle < 90)
          if (tested_edges[e.id] > 1) {
            continue;
          }

          tested_edges[e.id] = (tested_edges[e.id] ?? 0) + 1;

          const f = e.other(face);
          if (f && e.color & p.mask) {
            // switching face (will roll whole loop once again)
            p.face = f;
            changed = true;
          } else {
            // correction step - clamp into noface triangle
            const linepos = project_on_line_clamp(
              e.a.pos,
              e.b.pos,
              projected_pos,
            );

            // recursion!
            return this.move(id, linepos, tested_edges);
          }
          break;
        }
      }

      // final step - when point finnaly inside current face
      // apply data
      if (!changed) {
        p.bcpos.copy(bcpos);
        p.worldpos.copy(
          barycentric_to_cartesian(
            p.face.pa.pos,
            p.face.pb.pos,
            p.face.pc.pos,
            bcpos,
          ),
        );
      }

      if (deadlock > 10) {
        throw new Error("Navmesh::move. Deadlock");
      }
    }

    for (const k in tested_edges) {
      delete tested_edges[k];
    }

    return p.worldpos;
  }

  /**
   * @param {THREE.Mesh} mesh
   */
  build(mesh) {
    const indices = mesh.geometry.getIndex();
    const positions = mesh.geometry.getAttribute("position");
    const colors = mesh.geometry.getAttribute("color");
    const p = positions.array;
    const c = colors?.array ?? [];
    console.log(indices, positions, colors);
    for (let i = 0; i < indices.count; i += 3) {
      const pid1 = indices.array[i];
      const pid2 = indices.array[i + 1];
      const pid3 = indices.array[i + 2];
      const id1 = pid1 * 3;
      const id2 = pid2 * 3;
      const id3 = pid3 * 3;

      const v1 =
        this.verticies[pid1] ??
        (this.verticies[pid1] = new Vertex(
          p[id1],
          p[id1 + 1],
          p[id1 + 2],
          c[id1],
          c[id1 + 1],
          c[id1 + 2],
        ));
      const v2 =
        this.verticies[pid2] ??
        (this.verticies[pid2] = new Vertex(
          p[id2],
          p[id2 + 1],
          p[id2 + 2],
          c[id2],
          c[id2 + 1],
          c[id2 + 2],
        ));
      const v3 =
        this.verticies[pid3] ??
        (this.verticies[pid3] = new Vertex(
          p[id3],
          p[id3 + 1],
          p[id3 + 2],
          c[id3],
          c[id3 + 1],
          c[id3 + 2],
        ));

      const hash1 = this._svechash(v1.pos, v2.pos);
      const hash2 = this._svechash(v2.pos, v3.pos);
      const hash3 = this._svechash(v3.pos, v1.pos);
      /*
			const hash1 = this._shash(id1, id2);
			const hash2 = this._shash(id2, id3);
			const hash3 = this._shash(id3, id1);
			*/
      const e1 =
        this.edges[hash1] ?? (this.edges[hash1] = new Edge(hash1, v1, v2));
      const e2 =
        this.edges[hash2] ?? (this.edges[hash2] = new Edge(hash2, v2, v3));
      const e3 =
        this.edges[hash3] ?? (this.edges[hash3] = new Edge(hash3, v3, v1));
      const hashf = this._shash(id1, id2, id3);
      const face = new Face(hashf, v1, v2, v3, e1, e2, e3);
      this.faces[hashf] = face;
    }
  }

  dispose() {
    for (const k in this.faces) {
      this.faces[k].dispose();
    }

    this.points = {};
    this.verticies = {};
    this.edges = {};
    this.faces = {};
  }
}

export default Navmesh;
