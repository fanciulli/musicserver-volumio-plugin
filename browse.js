/*
 * Created on Mon Apr 06 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
var { request } = require("undici");
var {
  serviceHumanReadableName,
  browseSource,
  serviceName,
} = require("./constants");

class MusicServerBrowse {
  getServerBaseUrl() {
    return "http://192.168.0.136:3000";
  }

  async browse(uri) {
    const { body } = await request(this.getServerBaseUrl() + "/music/browse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: uri,
      }),
    });

    const data = await body.json();
    const page = this.#renderBrowsePage(uri, data);
    return page;
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

    const albumArt =
      this.getServerBaseUrl() + "/music/albumart?id=" + encodeURI(item.id);

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
        uri: "musicserver/" + item.id,
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
        uri: "musicserver/" + item.id,
      };
    }

    return null;
  }
}

module.exports = MusicServerBrowse;
