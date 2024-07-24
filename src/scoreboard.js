import logger from "./logger.js";

class Scoreboard {
  init(server_url) {
    this.server_url = server_url || "";
    if (!this.server_url) {
      logger.warn("No server url set. Scoreboard not available");
    }
  }

  get_rating(cb) {
		if (!this.server_url) {
			return cb(null);
		}

    var request = new window.XMLHttpRequest();
    request.open("GET", `https://${this.server_url}/score`, true);
    request.onload = function () {
      if (request.status >= 200 && request.status < 300) {
        let json = null;
        try {
          const json = JSON.parse(request.responseText);
        } catch (err) {
          logger.warn(err);
        }
        if (json) {
          cb(json);
        }
      } else {
        cb(request.status);
      }
    };
    request.onerror = cb;
    request.send();
  }

  save_score(score) {
		if (!this.server_url) {
			return;
		}

    var request = new window.XMLHttpRequest();
    request.open("POST", `https://${this.server_url}/score`, true);
    request.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    request.send('{"score": ' + score + "}");
  }

  /**
   * @returns {Scoreboard} .
   */
  static get instance() {
    if (!Scoreboard._instance) {
      Scoreboard._instance = new Scoreboard();
    }

    return Scoreboard._instance;
  }
}

export default Scoreboard;
