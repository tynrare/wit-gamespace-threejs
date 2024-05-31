 /** @namespace Core */

/**
 * @memberof Core
 * @enum {number}
 */
const LogCode = {
  info: 0,
  warn: 1,
  error: 2,
  details: 3,
};

/**
 * @memberof Core
 * @class Logger
 */
class Logger {
  static _instance;
  /** @type {function} */
  callback;
  /** @type {boolean} */
  print_console;

  /**
   * Current logging level less value produces more output
   * @type {number}
   */
  level;

  constructor() {
    this.level = 0;
    this.print_console = true;
  }

  /**
   * @returns {Logger} .
   */
  static get instance() {
    if (!Logger._instance) {
      Logger._instance = new Logger();
    }

    return Logger._instance;
  }

  /**
   * @param {function(LogCode, number, ...any): void} callback
   */
  init(callback) {
    this.callback = callback;
  }

  /**
   * @param {LogCode} code
   * @param {number} level
   */
  print(code, level, ...args) {
    if (level < this.level) {
      return;
    }

    if (this.callback) {
      this.callback(code, level, ...args);
    }

    if (!this.print_console) {
      return;
    }

    switch (code) {
      case LogCode.warn:
        console.warn(...args);
        break;
      case LogCode.error:
        console.error(...args);
        break;
      default:
        console.log(...args);
    }
  }

  log(...args) {
    this.print(LogCode.info, 0, ...args);
  }

  warn(...args) {
    this.print(LogCode.warn, 0, ...args);
  }

  error(...args) {
    this.print(LogCode.error, 0, ...args);
  }
}

const logger = Logger.instance;

export default logger;
export { logger, Logger, LogCode };
