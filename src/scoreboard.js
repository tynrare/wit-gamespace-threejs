import logger from "./logger.js";

class Scoreboard {
  init(server_url, token) {
    this.server_url = server_url || "";
    this.token = token || "";
    if (!this.server_url) {
      logger.warn("No server url set. Scoreboard not available");
    }
  }

  async get_rating() {
    if (!this.server_url) {
      return;
    }

    const url = `https://${this.server_url}/score?token=${this.token}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(response);
    }

    return await response.json();
  }

  async save_score(score) {
    if (!this.server_url) {
      return;
    }

    const url = `https://${this.server_url}/score?token=${this.token}`;
    return await fetch(url, {
      method: "POST",
      body: JSON.stringify({ score }),
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
    });

    //request.setRequestHeader();
  }

  /**
   * @param {Object} data .
   * @param {number} data.position
   * @param {number} data.score
   * @param {Object} data.user
   * @param {string} data.user.first_name
   * @param {string} data.user.last_name
   * @param {string} data.user.username
   */
  construct_scoreentry(data) {
    const user = data.user;
    return `
		<div>
		<div class="position">${data.position}.</div>
		<div class="name">${user.first_name} ${user.last_name ?? ""}:</div>
		<div class="score">${data.score}</div>
		</div>
		`;
  }

  construct_scoreboard(data) {
    let str = "";
    for (const i in data) {
      str += this.construct_scoreentry(data[i]);
    }

    return str;
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
