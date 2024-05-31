/** @namespace Config */

/**
 * app config 
 *
 * @memberof Config
 */
class AppConfig {
  static _instance;

  constructor() {
		this.input_movement_threshold = 0.4;
  }

  /**
   * @returns {AppConfig} .
   */
  static get instance() {
    if (!AppConfig._instance) {
      AppConfig._instance = new AppConfig();
    }

    return AppConfig._instance;
  }
}

/**
 * render config for {@link Render.Render}
 *
 * @memberof Config
 */
class RenderConfig {
  static _instance;

  constructor() {
    /** @type {number} */
    this.camera_fov = 75;
  }

  /**
   * @returns {RenderConfig} .
   */
  static get instance() {
    if (!RenderConfig._instance) {
      RenderConfig._instance = new RenderConfig();
    }

    return RenderConfig._instance;
  }
}

/**
 * Pawn config for {@link ThirdPersonControllers.PawnThirdPerson}
 *
 * @memberof Config
 */
class PawnConfig {
  constructor() {
    /*
     * This factor affects only model rotation.
     * To affect actual rotation speed
     * change CameraConfig::rotation_active_speed
     *
     * @type {number}
     */
    this.rotation_speed = 0.1;
    /**
     * @type {number}
     */
    this.movement_speed = 4.2;
    /**
     * decreases X movement factor
     * depending on Y
     *
     * @type {number}
     */
    this.steer_threshold = 0;
  }
}

/**
 * Camera config for {@link ThirdPersonControllers.CameraThirdPerson}
 *
 * @memberof Config
 */
class CameraConfig {
  constructor() {
    /**
     * x distance to target
     */
    this.distance = 10;
    /**
     * z height
     */
    this.height = 50;
    /**
     * how fast camera follows target
     */
    this.follow_speed = 0.2;
    /**
     * how fast camera rotates durning idle
     */
    this.rotation_passive_speed = 0.1;
    /**
     * how fast camera rotates durning input
     */
    this.rotation_active_speed = 0.06;
    /**
     * actial camera movement speed
     */
    this.camera_speed = 0.07;
    /**
     * scales rotation_speed depends on camera-target radial distance durning idle
		 *
		 * After input end, if pawn looks directly at camenra:
		 * - Value 0.5 - camera quickly turns behind pawn
		 * - Value 1 - camera looks at pawn for few secs
		 * - Value 2 - camera looks at pawnwithout turning
		 * - Value above 2 - camera turns behind pawn really slow
		 *
     */
    this.stick_passive_factor = 0.7;
    /**
     * scales rotation_speed depends on camera-target radial distance durning input. 
		 * Not active while attach_to_pawn==true
     */
    this.stick_active_factor = 2;
		/**
		 * Camera always follows pawn.
		 * Pawn able to look at camera if disabled;
		 */
		this.attach_to_pawn = true;
  }
}

export { AppConfig, RenderConfig, PawnConfig, CameraConfig };
