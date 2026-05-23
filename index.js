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
  UnauthorizedError,
} = require("./constants");

class MusicServerPlugin {
  #commandRouter;
  #browse;
  #boundBrowseFun;
  #boundExplodeUriFun;
  #playback;
  #search;
  #configuration;
  #i18nStrings = {};

  constructor(context) {
    this.#configuration = new configuration(context);

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
    const langCode = this.#commandRouter.sharedVars.get("language_code");
    try {
      this.#i18nStrings = require(`./i18n/strings_${langCode}.json`);
    } catch {
      this.#i18nStrings = require("./i18n/strings_en.json");
    }
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

  getUIConfig() {
    var defer = libQ.defer();
    var langCode = this.#commandRouter.sharedVars.get("language_code");

    const protocol = this.#configuration.getProtocol();
    const protocolLabel = protocol === "http" ? "HTTP" : "HTTPS";
    const host = this.#configuration.getHost();
    const port = this.#configuration.getPort();

    const apiKey = this.#configuration.getApiKey();

    this.#commandRouter
      .i18nJson(
        __dirname + "/i18n/strings_" + langCode + ".json",
        __dirname + "/i18n/strings_en.json",
        __dirname + "/UIConfig.json",
      )
      .then(function (uiconf) {
        uiconf.sections[0].content[0].value.value = protocol;
        uiconf.sections[0].content[0].value.label = protocolLabel;
        uiconf.sections[0].content[1].value = host;
        uiconf.sections[0].content[2].value = port;
        uiconf.sections[0].content[3].value = apiKey;
        defer.resolve(uiconf);
      })
      .fail(function (error) {
        defer.reject(error);
      });

    return defer.promise;
  }

  saveServerSettings(data) {
    this.#configuration.setProtocol(data.protocol.value);
    this.#configuration.setHost(data.host);
    this.#configuration.setPort(parseInt(data.port, 10));
    this.#configuration.setApiKey(data.apiKey);

    this.#commandRouter.pushToastMessage(
      "success",
      "Music Server",
      "Configuration saved",
    );
    return libQ.resolve();
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

    var self = this;
    var defer = libQ.defer();

    fun(pluginUri)
      .then(function (data) {
        defer.resolve(data);
      })
      .catch(function (err) {
        if (err instanceof UnauthorizedError) {
          self.#showInvalidApiKeyToast();
          defer.resolve({ navigation: { lists: [], prev: { uri: pluginUri } } });
        } else {
          defer.reject(err);
        }
      });

    return defer.promise;
  }

  #showInvalidApiKeyToast() {
    this.#commandRouter.pushToastMessage(
      "error",
      this.#i18nStrings.INVALID_API_KEY_TITLE,
      this.#i18nStrings.INVALID_API_KEY_MESSAGE,
    );
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
    var self = this;
    var defer = libQ.defer();

    this.#search
      .search(query)
      .then(function (data) {
        defer.resolve(data);
      })
      .catch(function (err) {
        if (err instanceof UnauthorizedError) {
          self.#showInvalidApiKeyToast();
          defer.resolve([]);
        } else {
          defer.reject(err);
        }
      });

    return defer.promise;
  }
}

module.exports = MusicServerPlugin;
