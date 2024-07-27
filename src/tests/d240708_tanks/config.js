/** @namespace Config */

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
		this.acceleration_factor = 0.4;

    /**
     * @type {number}
     */
    this.movement_speed = 0.2;

    /**
     * decreases X movement factor
     * depending on Y
     *
     * @type {number}
     */
    this.steer_threshold = 0;

		this.mass = 10;
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

export { PawnConfig, CameraConfig };
