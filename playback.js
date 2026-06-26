const { serviceName } = require("./constants");

/*
 * Created on Mon Apr 06 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
const { musicProxyPort } = require("./constants");

class MusicServerPlayback {
  #context;
  #mpdPlugin;
  #commandRouter;
  #logger;

  constructor(context, mpdPlugin) {
    this.#context = context;
    this.#mpdPlugin = mpdPlugin;
    this.#commandRouter = context.coreCommand;
    this.#logger = context.logger;
  }

  clear() {
    return this.#mpdPlugin.sendMpdCommand("clear", []);
  }

  pause() {
    return this.#mpdPlugin.sendMpdCommand("pause", []);
  }

  stop() {
    return this.#mpdPlugin.sendMpdCommand("stop", []);
  }

  resume() {
    return this.#mpdPlugin.sendMpdCommandArray([
      { command: "play", parameters: [] },
    ]);
  }

  clearAddPlayTrack(track) {
    const state = {
      title: track.title,
      artist: track.artist,
      album: track.album,
    };
    this.#commandRouter.stateMachine.setConsumeUpdateService(
      "mpd",
      true,
      false,
    );

    const index = track["uri"].indexOf("/music");

    if (index >= 0) {
      const uriPart = track["uri"].substring(index);
      const trackUri = `http://localhost:${musicProxyPort}${uriPart}`;
      this.#logger.info(`Using uri: ${trackUri}`);

      return this.#mpdPlugin.sendMpdCommandArray([
        { command: "clear", parameters: [] },
        { command: "add", parameters: [trackUri] },
        { command: "play", parameters: [] },
      ]);
    }
  }

  remove(position) {
    return this.#mpdPlugin.sendMpdCommand("delete", [position]);
  }

  next() {
    return this.#mpdPlugin.sendMpdCommand("next", []);
  }

  previous() {
    return this.#mpdPlugin.sendMpdCommand("previous", []);
  }

  seek(timepos) {
    return this.#mpdPlugin.seek(timepos);
  }

  random(randomcmd) {
    var string = randomcmd ? 1 : 0;
    return this.#mpdPlugin.sendMpdCommand("random", [string]);
  }

  repeat(repeatcmd) {
    var string = repeatcmd ? 1 : 0;
    return this.#mpdPlugin.sendMpdCommand("repeat", [string]);
  }

  clear() {
    return this.#mpdPlugin.sendMpdCommand("clear", []);
  }
}

module.exports = MusicServerPlayback;
