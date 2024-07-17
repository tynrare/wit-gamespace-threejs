import PawnDrawA from "../pawn/d240710_pawn.js";
import * as THREE from "three";
import { Vector3 } from "three";
import { oimo } from "../lib/OimoPhysics.js";
import { Physics, RigidBody, RigidBodyType } from "../physics.js";
import Loader from "../loader.js";
import App from "../app.js";
import { dlerp, Vec3Right, Vec3Up, cache } from "../math.js";
import { InputAction } from "../pawn/inputs_dualstick.js";
import { createImagePlane } from "./utils.js";
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

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
        this.charge_elapsed = 0;
        this.charge = 0;
        this.charge_applied = 0;

        this.config = {
            charge_duration: 1000,
            throw_factor: 30
        }

        this.attack = false;
        this.move = false;
    }


    /**
     * 
     * @param {InputAction} type .
     * @param {boolean} start . 
     * @returns 
     */
    action(type, start) {
        if (this.stun > 0 && start) {
            return;
        }

        switch (type) {
            case InputAction.action_a:
                this.move = start;
                break;
            case InputAction.action_b:
                this.attack = start;
                break;
        }
    }


    /**
     * @param {number} x .
     * @param {number} x .
     * @param {string} tag .
     * @param {InputAction} type .
     */
    action_analog(x, y, type) {
        if (this.stun > 0) {
            return;
        }

        const p = cache.vec3.v1;
        const ap = cache.vec3.v2;
        const bp = cache.vec3.v3;
        p.set(-x, 0, -y);
        ap.copy(this.pawn_dbg_mesh.position);
        ap.y = 0.1;
        bp.copy(p).add(ap);

        const attack = this.attack || this.spawn_projectile_requested;
        if (p.length() && (!attack || type != InputAction.action_a)) {
            this.set_goal(bp);
        }

        this._physics.raycast(ap, bp, (s, h) => {
            bp.set(h.position.x, 0, h.position.z);
        });

        switch (type) {
            case InputAction.action_a:
                this.pointer_mesh_a.position.copy(bp);
                const velocity = this._physics.cache.vec3_2;
                this.pawn_body.getLinearVelocityTo(velocity);
                const force = this._physics.cache.vec3_0;
                force.init(p.x, 0, p.z);
                if (attack) {
                    force.init(0, 0, 0);
                }
                if (!this.move) {
                    velocity.x *= 0.2;
                    velocity.z *= 0.2;
                    this.pawn_body.setLinearVelocity(velocity);
                }
                const position = this._physics.cache.vec3_1;
                const dot = force.normalized().dot(velocity.normalized());
                const speed = velocity.length();
                this.pawn_body.getPositionTo(position);
                position.y -= 0.1;
                force.scaleEq((2 - dot) * Math.max(0, 5 - speed) * 5);
                this.pawn_body.applyForce(force, position);
                break;
            case InputAction.action_b:
                if (this.attack) {
                    this.pointer_mesh_b.position.copy(bp);
                    //this.camera_controls.set_direction(p);
                } else {
                    p.copy(this.pointer_mesh_b.position).sub(ap).normalize();
                    // stick released
                    this.spawn_projectile(p);
                }

                break;
        }
    }

    /**
     * @param {number} dt .
     */
    step(dt) {
        this.charge_elapsed = this.attack ? this.charge_elapsed + dt : 0;
        this.charge = Math.min(1, this.charge_elapsed / this.config.charge_duration);

        this.step_pawn(dt);
        this.animate(dt);
        this.stabilizate_pawn(dt);

        this.stun -= dt * 1e-3;
        this.stun = Math.max(this.stun, 0);
        if (this.stun) {
            this.spawn_projectile_requested = false;
            this.charge_elapsed = 0;
            this.charge_applied = 0;
        }
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

        const update_pointer = (mesh, visible) => {
            const pointer_size = visible ? 1 : 0;
            mesh.scale.setScalar(dlerp(mesh.scale.x, pointer_size, 1, dt * 1e-3));
            mesh.rotateY(3e-4 * dt);
        };
        update_pointer(this.pointer_mesh_a, this.move);
        update_pointer(this.pointer_mesh_b, this.attack);

        this.pointer_mesh_charge.scale.x = this.charge * 4;
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
        } else if (this.spawn_projectile_requested && !action_hit.enabled) {
            // something interrupted animation - spawn requests discards
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

        const render = App.instance.render;
        const scene = render.scene;
        this.pointer_mesh_a = render.utils.spawn_icosphere0(0xb768e9);
        this.pointer_mesh_b = render.utils.spawn_icosphere0(0xb7e968);
        scene.add(this.pointer_mesh_a);
        scene.add(this.pointer_mesh_b);        

        return this;
    }

    async load() {
        this.character_gltf = await Loader.instance.get_gltf("bowling/pawn1.glb");
        this.character_scene = SkeletonUtils.clone(this.character_gltf.scene);
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

        const arrow = createImagePlane("bowling/arrow0.png");;
        this.pointer_mesh_charge = new THREE.Object3D();
        this.pointer_mesh_charge.add(arrow)
        this.pointer_mesh_charge.position.y = 0.3;
        arrow.position.x = 0.5;
        arrow.rotateX(-Math.PI * 0.5);
        arrow.rotateZ(-Math.PI * 0.5);
        this.character_scene.add(this.pointer_mesh_charge);
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
        impulse.init(d.x, 0, d.z);
        impulse.scaleEq(this.config.throw_factor * this.charge_applied);
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
        body.temporal = true;
        const mesh = this.projectile_gltf.scene.clone();
        mesh.scale.multiplyScalar(radius * 2);
        mesh.position.copy(pos);
        App.instance.render.scene.add(mesh);
        this._physics.attach(body, mesh);
        body.applyLinearImpulse(impulse);
        this.charge_applied = 0;
    }

    spawn_projectile() {
        this.spawn_projectile_requested = true;
        this.charge_applied = this.charge;
        this.pawn_draw.animator.transite("hit", true);
    }

    stop() {
        this.pawn_draw?.dispose();
        this.character_scene = null;
        this.character_gltf = null;
        this.pawn_draw = null;
        this.pawn_body = null;
        this.pawn_dbg_mesh?.removeFromParent();
        this.pointer_mesh_a?.removeFromParent();
        this.pointer_mesh_b?.removeFromParent();
        this.pointer_mesh_charge?.removeFromParent();
        this.pawn_dbg_mesh = null;
        this._physics = null;
    }
}

export default AdTestcaseBowlingPawn;