import PageSplashscreenBowling from "../splashcreen_bowling.js";

const SUPERPOWERS_BOWLING = {
  immortality: {
    header: "Immortality",
    description: "No one can die",
  },
  bigbrother: {
    header: "Big Bro",
    description: "You are bigger",
  },
};

class SuperpowerImmortality {
  /**
   * @param {PageSplashscreenBowling} psb
   */
  constructor(psb) {
    this.psb = psb;
		this.enabled = false;
  }
  enable() {
		this.enabled = true;
    this.psb.session.ui.classList.add("hide-hearts");
  }
  disable() {
		this.enabled = false;
    this.psb.session.ui.classList.remove("hide-hearts");
  }
  step(dt) {
    if (!this.enabled) {
      return;
    }

    for (const k in this.psb.level.pawns) {
      const pawn = this.psb.level.pawns[k];
      pawn.pawn_behaviour.invulnerable = true;
      pawn.pawn_behaviour.hearts_spent = 0;
    }
  }
}

class SuperpowerBigbro {
  /**
   * @param {PageSplashscreenBowling} psb
   */
  constructor(psb) {
    this.psb = psb;
		this.enabled = false;
  }
  enable() {
		this.enabled = true;
		this._remake_pawn(this.enabled);
  }
	_remake_pawn(enabled) {
		const level = this.psb.level;
		level.remove_pawn(level.pawn.id);
    level.pawn = level.create_pawn(null, null, false, false);
		if (enabled) {
			level.pawn.config.body_width = 0.5;
		}
		level.pawn.run();
		level.pawn.load().then(() => {
			if (enabled) {
				level.pawn.character_scene.scale.multiplyScalar(1.2);
			}
		});
	}
  disable() {
		this.enabled = false;
		this._remake_pawn(this.enabled);
  }
  step(dt) {
  }
}

const SUPERPOWERS_CLASSES = {
	immortality: SuperpowerImmortality,
	bigbrother: SuperpowerBigbro,
}

export { SUPERPOWERS_BOWLING, SUPERPOWERS_CLASSES };
