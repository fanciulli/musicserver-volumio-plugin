/*
 * Created on Wed Apr 15 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
var { serviceUriScheme, serviceName } = require("./constants");

function toBrowseUri(rawUri) {
  const uri = rawUri || "";
  const normalized = uri.startsWith(serviceUriScheme)
    ? uri.slice(serviceUriScheme.length)
    : uri;

  return serviceName + "/" + rawUri;
}

module.exports.toBrowseUri = toBrowseUri;
