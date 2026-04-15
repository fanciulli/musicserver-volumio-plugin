/*
 * Created on Sun Apr 05 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
var libQ = require("kew");
var browse = require("./browse");
var playback = require("./playback");
var search = require("./search");
var configuration = require("./config");
var {
  serviceHumanReadableName,
  browseSource,
  serviceName,
} = require("./constants");

class MusicServerPlugin {
  #commandRouter;
  #browse;
  #boundBrowseFun;
  #boundExplodeUriFun;
  #playback;
  #search;
  #configuration;

  constructor(context) {
    this.#configuration = new configuration();

    this.#commandRouter = context.coreCommand;
    this.#browse = new browse(this.#configuration);
    this.#boundBrowseFun = this.#browse.browse.bind(this.#browse);
    this.#boundExplodeUriFun = this.#browse.explodeUri.bind(this.#browse);

    const mpdPlugin = this.#commandRouter.pluginManager.getPlugin(
      "music_service",
      "mpd",
    );

    this.#playback = new playback(mpdPlugin, context.coreCommand);
    this.#search = new search(this.#configuration);
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
    return this.#checkUriAndExecute(uri, this.#boundBrowseFun);
  }

  explodeUri(uri) {
    return this.#checkUriAndExecute(uri, this.#boundExplodeUriFun);
  }

  #checkUriAndExecute(uri, fun) {
    if (!uri.startsWith(serviceName)) {
      return libQ.reject(new Error("Unsupported URI: " + uri));
    }

    var pluginUri = "";
    if (uri === serviceName) {
      pluginUri = "/";
    } else {
      pluginUri = uri.substring(serviceName.length + 1);
    }

    var defer = libQ.defer();

    fun(pluginUri).then(function (data) {
      defer.resolve(data);
    });

    return defer.promise;
  }

  clear() {
    return this.#playback.clear();
  }

  pause() {
    return this.#playback.pause();
  }

  stop() {
    return this.#playback.stop();
  }

  resume() {
    return this.#playback.resume();
  }

  clearAddPlayTrack(track) {
    return this.#playback.clearAddPlayTrack(track);
  }

  remove(position) {
    return this.#playback.remove(position);
  }

  next() {
    return this.#playback.next();
  }

  previous() {
    return this.#playback.previous();
  }

  seek(timepos) {
    return this.#playback.seek(timepos);
  }

  random(randomcmd) {
    this.#commandRouter.pushToastMessage(
      "success",
      "Random",
      string == true
        ? this.#commandRouter.getI18nString("COMMON.ON")
        : this.#commandRouter.getI18nString("COMMON.OFF"),
    );
    return this.#playback.random(randomcmd);
  }

  repeat(repeatcmd) {
    this.#commandRouter.pushToastMessage(
      "success",
      "Repeat",
      string == true
        ? this.#commandRouter.getI18nString("COMMON.ON")
        : this.#commandRouter.getI18nString("COMMON.OFF"),
    );
    return this.#playback.repeat(repeatcmd);
  }

  clear() {
    return this.#playback.clear();
  }

  search(query) {
    var defer = libQ.defer();

    this.#search.search(query).then(function (data) {
      defer.resolve(data);
    });

    return defer.promise;
  }
}

module.exports = MusicServerPlugin;
