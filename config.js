/*
 * Created on Wed Apr 15 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
class Configuration {
  #serverIp;
  #serverPort;

  constructor() {
    this.#serverIp = "192.168.0.136";
    this.#serverPort = "3000";
  }

  getServerUrl() {
    return "http://" + this.#serverIp + ":" + this.#serverPort;
  }
}

module.exports = Configuration;
