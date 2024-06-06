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
    this.camera_fov = 22;

		/**
		 * @type {number} 
		 */
		this.lightmaps_intensity = 3;

    /** 
		 * Enables threejs lights
		 *
		 * @type {boolean} 
		 */
		this.lights = true;

    /** 
		 * Enables threejs shadows
		 *
		 * @type {boolean} 
		 */
		this.shadows = false;

    /**
		 * Enabless threejs csm
		 * 
		 * @type {boolean} 
		 */
		this.cascaded_shadow_maps = false;
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
     * @type {number}
     */
    this.rotation_speed = 0.17;

    /*
     * @type {number}
     */
		this.acceleration_factor = 0.1;

    /**
     * @type {number}
     */
    this.movement_speed = 0.4;

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
    this.distance = 17;
    /**
     * z height
     */
    this.height = 19;
    /**
     * rotation
     */
    this.rotation = 2;
    /**
     * how fast camera follows target
     */
    this.follow_speed = 0.4;
    /**
     * actial camera movement speed
     */
    this.camera_speed = 0.2;
  }
}

export { AppConfig, RenderConfig, PawnConfig, CameraConfig };
