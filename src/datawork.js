class Datawork {
  /**
   * @param {string} namespace .
   */
  constructor(namespace) {
    this.namespace = namespace;
  }
  save(key, value) {
		Datawork.save(this.namespace, key, value);
	}
  load(key) {
		return Datawork.load(this.namespace, key);
	}
  static save(namespace, key, value) {
		if (typeof value !== "number") {
			throw new Error("Cannot save not-number values");
		}

		localStorage.setItem(`${namespace}-${key}`, value);
	}
  static load(namespace, key) {
		const val = Number(localStorage.getItem(`${namespace}-${key}`) ?? 0);
		if (isNaN(val)) {
			return 0;
		}

		return val;
	}
}

export default Datawork;
