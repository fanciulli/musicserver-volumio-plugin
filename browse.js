/*
 * Created on Mon Apr 06 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
var { request } = require("undici");
var { serviceName } = require("./constants");
var { toBrowseUri } = require("./utils");

class MusicServerBrowse {
  #configuration;

  constructor(configuration) {
    this.#configuration = configuration;
  }

  #getStreamUrl() {
    return this.#configuration.getServerUrl() + "/music/stream?id=";
  }

  #getAlbumArtUrl() {
    return this.#configuration.getServerUrl() + "/music/albumart?id=";
  }

  #getBrowseUrl() {
    return this.#configuration.getServerUrl() + "/music/browse";
  }

  async browse(uri) {
    const data = await this.#getDataForUri(uri);
    const page = this.#renderBrowsePage(uri, data);
    return page;
  }

  async explodeUri(uri) {
    const data = await this.#getDataForUri(uri);

    if (data && data.length > 0) {
      return data.map((item) => {
        const encodedUri = encodeURI(item.id);
        return {
          service: serviceName,
          type: item.type,
          uri: this.#getStreamUrl() + encodedUri,
          title: item.metadata.title,
          name: item.metadata.title,
          artist: item.metadata.artist,
          album: item.metadata.album,
          albumart: this.#getAlbumArtUrl() + encodedUri,
        };
      });
    } else {
      return [];
    }
  }

  async #getDataForUri(uri) {
    const { body } = await request(this.#getBrowseUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: uri,
      }),
    });

    return await body.json();
  }

  #renderBrowsePage(curUri, items) {
    var mappedItems = (items || [])
      .map(this.#mapRemoteItem, this)
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
  }

  #mapRemoteItem(item) {
    if (!item || !item.id || !item.type) {
      return null;
    }

    const albumArt = this.#getAlbumArtUrl() + encodeURI(item.id);

    var metadata = item.metadata || {};
    if (item.type === "folder") {
      return {
        service: serviceName,
        type: "folder",
        title: metadata.name || item.id,
        artist: metadata.artist || "",
        year: metadata.year || "",
        album: metadata.album || "",
        icon: "fa fa-folder-open-o",
        uri: toBrowseUri(item.id),
        albumart: albumArt,
      };
    }

    if (item.type === "song") {
      return {
        service: serviceName,
        type: "song",
        title: metadata.title || metadata.name || item.id,
        name: metadata.title || metadata.name || item.id,
        artist: metadata.artist || "",
        album: metadata.album || "",
        duration: metadata.duration || 0,
        albumart: albumArt,
        uri: toBrowseUri(item.id),
      };
    }

    return null;
  }
}

module.exports = MusicServerBrowse;
