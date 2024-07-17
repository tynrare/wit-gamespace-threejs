import PawnDrawA from "../pawn/d240710_pawn.js";
import * as THREE from "three";
import { Vector3 } from "three";
import { oimo } from "../lib/OimoPhysics.js";
import { Physics, RigidBody, RigidBodyType } from "../physics.js";
import Loader from "../loader.js";
import App from "../app.js";
import { dlerp, Vec3Right, Vec3Up, cache } from "../math.js";

/**
 * @class AdTestcaseBowlingPawn
 * @memberof Pages/Tests
 */
class AdTestcaseBowlingPawn {
    constructor() {
        /** @type {PawnDrawA} */
        this.pawn_draw = null;

        /** @type {oimo.dynamics.rigidbody.RigidBody} */
        this.pawn_body = null;

        /** @type {THREE.Mesh} */
        this.pawn_dbg_mesh = null;

        /** @type {Physics} */
        this._physics = null;

        this.stun = 0;
    }

    /**
     * @param {number} dt .
     */
    step(dt) {
        this.step_pawn(dt);
        this.animate(dt);
        this.stabilizate_pawn(dt);

        this.stun -= dt * 1e-3;
        this.stun = Math.max(this.stun, 0);
    }


    animate(dt) {
        if (!this.pawn_draw) {
            return;
        }

        const star_size = this.stun > 0 ? 0.4 : 0;
        const stars_amount = this.vfx_animation_stars.children.length;
        for (let i = 0; i < stars_amount; i++) {
            const c = this.vfx_animation_stars.children[i];
            const f = 0.5 * (i / stars_amount) + 0.2;
            c.scale.setScalar(
                dlerp(c.scale.x, star_size, f, dt * 1e-3),
            );
        }

        this.vfx_animation_stars.rotation.y += dt * 3e-3;
    }


    step_pawn(dt) {
        if (!this.pawn_draw) {
            return;
        }
        const up = this._physics.get_body_up_dot(this.pawn_body);
        if (up < 0.9) {
            this.stun = 2;
        }

        // apply decoration mesh rotation
        const shift = cache.vec3.v4.set(0, -0.5, 0);
        shift.applyQuaternion(this.pawn_dbg_mesh.quaternion);
        this.pawn_draw._target.position.copy(this.pawn_dbg_mesh.position);
        this.pawn_draw._target.position.add(shift);
        this.pawn_draw.step(dt);
        // cd: discard pawn rotation and set correct world rotation
        this.pawn_draw._target.quaternion.copy(this.pawn_dbg_mesh.quaternion);
        this.pawn_draw._target.rotateY(this.pawn_draw.rotation);

        // place stars
        this.vfx_animation_stars.position.copy(this.pawn_draw._target.position);
        this.vfx_animation_stars.position.y += 0.7;
        this.vfx_animation_stars.position.add(shift.multiplyScalar(-2));

        // spawn projectile in animation middleplay
        const action_hit = this.pawn_draw.animator.animation_machine.nodes["hit"].action;
        if (
            this.spawn_projectile_requested &&
            action_hit.enabled &&
            action_hit.time > 0.5
        ) {
            this._spawn_projectile();
            this.spawn_projectile_requested = false;
        }
    }

    stabilizate_pawn(dt) {
        // locks rotation
        //this.pawn_body.setRotationFactor(this._physics.cache.vec3_0.init(0, 0, 0));

        // apply rotation stabilization
        const up = this._physics.get_body_up_dot(this.pawn_body);
        const stabilization = this._physics.cache.vec3_0;
        const r = this.pawn_body.getRotation().toEulerXyz();

        // torque applied ach step - it fas to be frame dependent
        const df = dt / 30;
        const s = 0.07 * df;

        stabilization.init(-r.x * s, -r.y * s, -r.z * s);
        stabilization.scaleEq(1 - up);
        stabilization.y = -r.y * s * up;
        this.pawn_body.applyAngularImpulse(stabilization);
    }

    /**
     * @param {THREE.Vector3} pos
     */
    set_goal(pos) {
        if (this.pawn_draw) {
            this.pawn_draw.goal.copy(pos);
        }
    }

    /**
     * 
     * @param {Physics} physics .
     * @returns AdTestcaseBowlingPawn this
     */
    run(physics) {
        this._physics = physics;

        const pos = new Vector3(0, 1, 0);
        const size = new Vector3(0.3, 1, 0);
        const id = this._physics.utils.create_physics_cylinder(
            pos,
            size,
            RigidBodyType.DYNAMIC,
            { friction: 0.1, density: 1, adamping: 5, ldamping: 1 },
            0x48a9b1,
        );
        const mesh = this._physics.meshlist[id];
        const body = this._physics.bodylist[id];
        this.pawn_body = body;
        this.pawn_dbg_mesh = mesh;

        return this;
    }

    async load() {
        this.character_gltf = await Loader.instance.get_gltf("bowling/pawn1.glb");
        this.character_scene = this.character_gltf.scene;
        this.projectile_gltf = await Loader.instance.get_gltf(
            "bowling/projectile1.glb"
        );

        const texture_sprite = Loader.instance.get_texture("pic/star0.png");
        const star_material = new THREE.SpriteMaterial({
            map: texture_sprite,
        });
        const sprite_star = new THREE.Sprite(star_material);
        sprite_star.scale.setScalar(0); // hide at creation
        this.vfx_animation_stars = new THREE.Object3D();
        App.instance.render.scene.add(this.vfx_animation_stars);

        const stars = 6;
        const radius = 0.5;
        for (let i = 0; i < stars; i++) {
            const s = sprite_star.clone();
            this.vfx_animation_stars.add(s);
            s.position.x = Math.sin((i / stars) * Math.PI * 2) * radius;
            s.position.z = Math.cos((i / stars) * Math.PI * 2) * radius;
        }

        this.pawn_draw = new PawnDrawA();
        this.pawn_draw.init(this.character_gltf, this.character_scene);
        App.instance.render.scene.add(this.character_scene);

        this.pawn_dbg_mesh.visible = false;
        this.pawn_draw.allow_move = false;
    }


    _spawn_projectile() {
        const radius = 0.4;
        const d = cache.vec3.v0;
        const pos = cache.vec3.v1;
        const facing_direction = d
            .copy(Vec3Right)
            .applyAxisAngle(Vec3Up, this.pawn_draw.rotation);
        pos
            .copy(d)
            .setLength(radius * 2)
            .add(this.pawn_draw._target.position);
        pos.y = 0.5;
        const impulse = this._physics.cache.vec3_0;
        impulse.init(d.x * 30, 0, d.z * 30);
        let color = new THREE.Color(Math.random(), Math.random(), Math.random());
        const body = this._physics.create_sphere(
            pos,
            radius,
            RigidBodyType.DYNAMIC,
            {
                density: 10,
                friction: 0.3,
                restitution: 0.7,
            },
        );
        const mesh = this.projectile_gltf.scene.clone();
        mesh.scale.multiplyScalar(radius * 2);
        mesh.position.copy(pos);
        App.instance.render.scene.add(mesh);
        this._physics.attach(body, mesh);
        body.applyLinearImpulse(impulse);
    }

    spawn_projectile() {
        this.spawn_projectile_requested = true;

        this.pawn_draw.animator.transite("hit", true);
    }
}

export default AdTestcaseBowlingPawn;