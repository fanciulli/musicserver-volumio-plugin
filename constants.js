/*
 * Created on Sun Apr 05 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
const serviceHumanReadableName = "Music Server";
const serviceName = "musicserver";

const browseSource = {
  name: serviceHumanReadableName,
  uri: serviceName,
  plugin_type: "music_service",
  plugin_name: serviceName,
  albumart: "/albumart?sourceicon=music_service/musicserver/musicserver.svg",
};

module.exports.serviceHumanReadableName = serviceHumanReadableName;
module.exports.browseSource = browseSource;
module.exports.serviceName = serviceName;
