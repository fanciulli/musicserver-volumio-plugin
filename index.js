"use strict";

var libQ = require("kew");
var fs = require("fs-extra");
var http = require("http");
var https = require("https");
var config = new (require("v-conf"))();

module.exports = ControllerMusicServer;

function ControllerMusicServer(context) {
  this.context = context;
  this.commandRouter = context.coreCommand;
  this.logger = context.logger;
  this.configManager = context.configManager;

  this.serviceName = "musicserver";

  this.state = {};
}

ControllerMusicServer.prototype.onVolumioStart = function () {
  var configFile = this.commandRouter.pluginManager.getConfigurationFile(
    this.context,
    "config.json",
  );
  this.config = new (require("v-conf"))();
  this.config.loadFile(configFile);

  this.mpdPlugin = this.commandRouter.pluginManager.getPlugin(
    "music_service",
    "mpd",
  );

  return libQ.resolve();
};

ControllerMusicServer.prototype.onStart = function () {
  this.addToBrowseSources();
  return libQ.resolve();
};

ControllerMusicServer.prototype.onStop = function () {
  this.removeFromBrowseSources();
  return libQ.resolve();
};

ControllerMusicServer.prototype.getConfigurationFiles = function () {
  return ["config.json"];
};

ControllerMusicServer.prototype.getUIConfig = function () {
  var defer = libQ.defer();
  var self = this;
  var langCode = this.commandRouter.sharedVars.get("language_code");

  self.commandRouter
    .i18nJson(
      __dirname + "/i18n/strings_" + langCode + ".json",
      __dirname + "/i18n/strings_en.json",
      __dirname + "/UIConfig.json",
    )
    .then(function (uiconf) {
      uiconf.sections[0].content[0].value =
        self.config.get("protocol") || "http";
      uiconf.sections[0].content[1].value =
        self.config.get("host") || "127.0.0.1";
      uiconf.sections[0].content[2].value = self.config.get("port") || 3000;
      defer.resolve(uiconf);
    })
    .fail(function (error) {
      self.logger.error("[musicserver] Unable to parse UIConfig: " + error);
      defer.reject(error);
    });

  return defer.promise;
};

ControllerMusicServer.prototype.saveServerSettings = function (data) {
  var protocol =
    data.protocol && data.protocol.value ? data.protocol.value : "http";
  var host = data.host && data.host.value ? data.host.value : "127.0.0.1";
  var parsedPort = parseInt(data.port && data.port.value, 10);
  var port = Number.isFinite(parsedPort) ? parsedPort : 3000;

  this.config.set("protocol", protocol);
  this.config.set("host", host);
  this.config.set("port", port);

  this.commandRouter.pushToastMessage(
    "success",
    "Music Server",
    "Configuration saved",
  );
  return libQ.resolve();
};

ControllerMusicServer.prototype.addToBrowseSources = function () {
  this.commandRouter.volumioAddToBrowseSources({
    name: "Music Server",
    uri: this.serviceName,
    plugin_type: "music_service",
    plugin_name: this.serviceName,
    albumart: "/albumart?sourceicon=music_service/musicserver/musicserver.svg",
  });
};

ControllerMusicServer.prototype.removeFromBrowseSources = function () {
  this.commandRouter.volumioRemoveToBrowseSources("Music Server");
};

ControllerMusicServer.prototype.handleBrowseUri = function (curUri) {
  var self = this;

  self.logger.info("Invoking handleBrowseUri with " + curUri);
  var defer = libQ.defer();

  if (!curUri.startsWith(this.serviceName)) {
    return libQ.reject(new Error("Unsupported URI: " + curUri));
  }

  let remotePath = "";
  if (curUri.startsWith("musicserver/browse/"))
    remotePath = decodeURIComponent(
      curUri.substring("musicserver/browse/".length),
    );

  this._browseRemote(remotePath)
    .then(function (items) {
      defer.resolve(self._renderBrowsePage(curUri, items));
    })
    .fail(function (error) {
      self.logger.error("[musicserver] Browse failed: " + error);
      defer.reject(error);
    });

  return defer.promise;
};

ControllerMusicServer.prototype.explodeUri = function (uri) {
  var self = this;
  var defer = libQ.defer();

  self.logger.info("Invoking explodeUri with " + uri);

  if (!uri || !uri.startsWith(this.serviceName + "/song/")) {
    return libQ.resolve([]);
  }

  let remotePath = decodeURIComponent(
    uri.substring("musicserver/song/".length),
  );

  this._browseRemote(remotePath).then(function (items) {
    //defer.resolve(self._renderBrowsePage(uri, items));
    var encodedId = uri.substring((self.serviceName + "/song/").length);
    var streamUrl = self._getServerBaseUrl() + "/stream?id=" + encodedId;
    self.logger.info("Stream URl " + streamUrl);
    self.logger.info(JSON.stringify(items));

    var albumartUrl = self._getServerBaseUrl() + "/albumart?id=" + encodedId;

    const response = [
      {
        service: self.serviceName,
        type: "track",
        uri: streamUrl,
        title: items[0].metadata.title,
        name: items[0].metadata.title,
        artist: items[0].metadata.artist,
        album: items[0].metadata.album,
        albumart: albumartUrl,
      },
    ];

    self.logger.info(JSON.stringify(response));

    defer.resolve(response);
  });

  return defer.promise;
};

ControllerMusicServer.prototype.search = function () {
  return libQ.resolve({
    navigation: {
      lists: [
        {
          availableListViews: ["list"],
          items: [],
        },
      ],
    },
  });
};

ControllerMusicServer.prototype._renderBrowsePage = function (curUri, items) {
  var self = this;

  var mappedItems = (items || [])
    .map(function (item) {
      return self._mapRemoteItem(item);
    })
    .filter(function (item) {
      return !!item;
    });

  return {
    navigation: {
      prev: {
        uri: curUri,
      },
      lists: [
        {
          title: "Music Server",
          availableListViews: ["list", "grid"],
          items: mappedItems,
        },
      ],
    },
  };
};

ControllerMusicServer.prototype._mapRemoteItem = function (item) {
  if (!item || !item.id || !item.type) {
    return null;
  }

  var metadata = item.metadata || {};
  if (item.type === "folder") {
    return {
      service: this.serviceName,
      type: "folder",
      title: metadata.name || item.id,
      artist: metadata.artist || "",
      year: metadata.year || "",
      album: metadata.album || "",
      icon: "fa fa-folder-open-o",
      uri: "musicserver/browse/" + encodeURIComponent(item.id),
      albumart:
        "/albumart?sourceicon=music_service/musicserver/musicserver.svg",
    };
  }

  if (item.type === "song") {
    var albumartUrl =
      this._getServerBaseUrl() + "/albumart?id=" + encodeURIComponent(item.id);

    return {
      service: this.serviceName,
      type: "song",
      title: metadata.title || metadata.name || item.id,
      name: metadata.title || metadata.name || item.id,
      artist: metadata.artist || "",
      album: metadata.album || "",
      duration: metadata.duration || 0,
      albumart: albumartUrl,
      uri: "musicserver/song/" + encodeURIComponent(item.id),
    };
  }

  return null;
};

ControllerMusicServer.prototype._getParentUri = function (curUri) {
  if (!curUri || curUri === this.serviceName) {
    return "/";
  }

  var idx = curUri.lastIndexOf("/");
  if (idx <= this.serviceName.length) {
    return this.serviceName;
  }

  return curUri.substring(0, idx);
};

ControllerMusicServer.prototype._browseRemote = function (path) {
  return this._httpJson("/browse", "POST", {
    path: path,
  });
};

ControllerMusicServer.prototype._getServerBaseUrl = function () {
  var protocol = this.config.get("protocol") || "http";
  var host = this.config.get("host") || "127.0.0.1";
  var port = this.config.get("port") || 3000;

  return protocol + "://" + host + ":" + port;
};

ControllerMusicServer.prototype.pause = function () {
  this.logger.info("ControllerMusicServer::pause");
  return this.mpdPlugin.sendMpdCommand("pause", []);
};

ControllerMusicServer.prototype.stop = function () {
  this.logger.info("ControllerMusicServer::stop");
  return this.mpdPlugin.sendMpdCommand("stop", []);
};

ControllerMusicServer.prototype.resume = function () {
  var self = this;

  return self.mpdPlugin
    .sendMpdCommandArray([{ command: "play", parameters: [] }])
    .then(function () {
      // setTimeout
      if (self.timer) {
        self.timer.resume();
      }

      // adapt play status and update state machine
      self.state.status = "play";
      self.commandRouter.servicePushState(self.state, self.serviceName);
    });
};

ControllerMusicServer.prototype.clearAddPlayTrack = function (track) {
  var self = this;
  self.logger.info("Invoking clearAddPlayTrack with ", track);

  const state = {
    title: track.title,
    artist: track.artist,
    album: track.album,
  };
  //self.commandRouter.servicePushState(state, self.servicename);
  self.commandRouter.stateMachine.setConsumeUpdateService("mpd", true, false);

  return self.mpdPlugin.sendMpdCommandArray([
    { command: "clear", parameters: [] },
    { command: "add", parameters: [track["uri"]] },
    { command: "play", parameters: [] },
  ]);
};

ControllerMusicServer.prototype._httpJson = function (endpoint, method, body) {
  var defer = libQ.defer();

  var url = new URL(this._getServerBaseUrl() + endpoint);
  var isHttps = url.protocol === "https:";
  var transport = isHttps ? https : http;
  var payload = body ? JSON.stringify(body) : null;

  var requestOptions = {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 8000,
  };

  if (payload) {
    requestOptions.headers["Content-Length"] = Buffer.byteLength(payload);
  }

  var req = transport.request(requestOptions, function (res) {
    var raw = "";

    res.on("data", function (chunk) {
      raw += chunk;
    });

    res.on("end", function () {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        defer.reject(
          new Error("HTTP " + res.statusCode + " from remote server"),
        );
        return;
      }

      if (!raw) {
        defer.resolve({});
        return;
      }

      try {
        defer.resolve(JSON.parse(raw));
      } catch (error) {
        defer.reject(new Error("Invalid JSON response from remote server"));
      }
    });
  });

  req.on("error", function (error) {
    defer.reject(error);
  });

  req.on("timeout", function () {
    req.destroy(new Error("Remote server request timeout"));
  });

  if (payload) {
    req.write(payload);
  }

  req.end();

  return defer.promise;
};
