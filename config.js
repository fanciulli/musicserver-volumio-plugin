/*
 * Created on Wed Apr 15 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
class Configuration {
  #config;

  constructor(context) {
    var configFile = context.coreCommand.pluginManager.getConfigurationFile(
      context,
      "config.json",
    );

    this.#config = new (require("v-conf"))();
    this.#config.loadFile(configFile);
  }

  getServerUrl() {
    return (
      this.#config.get("protocol") +
      "://" +
      this.#config.get("host") +
      ":" +
      this.#config.get("port")
    );
  }

  getHost() {
    return this.#config.get("host");
  }

  getPort() {
    return this.#config.get("port");
  }

  getProtocol() {
    return this.#config.get("protocol");
  }

  setHost(host) {
    this.#config.set("host", host);
    this.#config.save();
  }

  setPort(port) {
    this.#config.set("port", port);
    this.#config.save();
  }

  setProtocol(protocol) {
    this.#config.set("protocol", protocol);
    this.#config.save();
  }

  getApiKey() {
    return this.#config.get("apiKey");
  }

  setApiKey(apiKey) {
    this.#config.set("apiKey", apiKey);
    this.#config.save();
  }
}

module.exports = Configuration;
