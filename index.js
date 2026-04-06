/*
 * Created on Sun Apr 05 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
var libQ = require("kew");
var browse = require("./browse");
var {
  serviceHumanReadableName,
  browseSource,
  serviceName,
} = require("./constants");

class MusicServerPlugin {
  #context;
  #commandRouter;
  #browse;

  constructor(context) {
    this.#context = context;
    this.#commandRouter = context.coreCommand;
    this.#browse = new browse();
  }

  onVolumioStart() {
    return libQ.resolve();
  }

  onStart() {
    this.#commandRouter.volumioAddToBrowseSources(browseSource);
    return libQ.resolve();
  }

  onStop() {
    this.#commandRouter.volumioRemoveToBrowseSources(serviceHumanReadableName);
    return libQ.resolve();
  }

  getConfigurationFiles() {
    return ["config.json"];
  }

  handleBrowseUri(uri) {
    if (!uri.startsWith(serviceName)) {
      return libQ.reject(new Error("Unsupported URI: " + curUri));
    }

    var pluginUri = "";
    if (uri === serviceName) {
      pluginUri = "/";
    } else {
      pluginUri = uri.substring(serviceName.length + 1);
    }

    var defer = libQ.defer();

    this.#browse.browse(pluginUri).then(function (data) {
      defer.resolve(data);
    });

    return defer.promise;
  }
}

module.exports = MusicServerPlugin;
