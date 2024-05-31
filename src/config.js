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
    this.camera_fov = 50;
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
 * Pawn config for {@link PawnControllers.PawnTankA}
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
    this.rotation_speed = 0.07;
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
 * Camera config for {@link PawnControllers.CameraTopdown}
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
    this.height = 40;
    /**
     * rotation
     */
    this.rotation = 0;
    /**
     * how fast camera follows target
     */
    this.follow_speed = 0.4;
    /**
     * actial camera movement speed
     */
    this.camera_speed = 0.4;
  }
}

export { AppConfig, RenderConfig, PawnConfig, CameraConfig };
