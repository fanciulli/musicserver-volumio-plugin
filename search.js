/*
 * Created on Tue Apr 07 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
const { request } = require("undici");
const { serviceHumanReadableName, serviceName } = require("./constants");

class MusicServerSearch {
  #configuration;

  constructor(configuration) {
    this.#configuration = configuration;
  }

  #getSearchUrl() {
    return this.#configuration.getServerUrl() + "/music/search";
  }

  #getAlbumArtUrl() {
    return this.#configuration.getServerUrl() + "/music/albumart?id=";
  }

  async search(query) {
    const artistsPromise = this.#searchCategory(query.value, "artist");
    const albumsPromise = this.#searchCategory(query.value, "album");
    const songePromise = this.#searchCategory(query.value, "song");

    const [artists, albums, songs] = await Promise.all([
      artistsPromise,
      albumsPromise,
      songePromise,
    ]);

    if (artists.length == 0 && albums.length == 0 && songs.length == 0) {
      return [];
    } else {
      const list = [];

      if (artists.length > 0) {
        list.push({
          title: "Artists from " + serviceHumanReadableName,
          availableListViews: ["list", "grid"],
          items: artists.map((artist) => ({
            service: serviceName,
            type: "folder",
            title: artist.metadata.name,
            uri: serviceName + "/" + artist.id,
            albumart: this.#getAlbumArtUrl() + encodeURI(artist.id),
          })),
        });
      }

      if (albums.length > 0) {
        list.push({
          title: "Albums from " + serviceHumanReadableName,
          availableListViews: ["list", "grid"],
          items: albums.map((album) => ({
            service: serviceName,
            type: "folder",
            title: album.metadata.name,
            artist: album.metadata.artist,
            uri: serviceName + "/" + album.id,
            albumart: this.#getAlbumArtUrl() + encodeURI(album.id),
          })),
        });
      }

      if (songs.length > 0) {
        list.push({
          title: "Songs from " + serviceHumanReadableName,
          availableListViews: ["list"],
          items: songs.map((song) => ({
            service: serviceName,
            type: "song",
            title: song.metadata.name,
            artist: song.metadata.artist,
            album: song.metadata.album,
            name: song.metadata.name,
            uri: serviceName + "/" + song.id,
            albumart: this.#getAlbumArtUrl() + encodeURI(song.id),
          })),
        });
      }

      return list;
    }
  }

  async #searchCategory(query, category) {
    const { body } = await request(this.#getSearchUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: query,
        category: category,
      }),
    });

    return await body.json();
  }
}

module.exports = MusicServerSearch;
