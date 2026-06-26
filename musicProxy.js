/*
 * Created on Mon Jun 22 2026
 *
 * Author: Massimiliano Fanciulli
 *
 * GitHub: https://github.com/fanciulli
 */
const fastify = require("fastify");
const { request, Agent } = require("undici");
const { createCache } = require("async-cache-dedupe");
const { musicProxyPort } = require("./constants");

const CACHE_TTL_SECONDS = 60;
const HEADER_API_KEY = "x-api-key";

const HTTP_ERROR_BAD_REQUEST = 400;
const HTTP_ERROR_BAD_GATEWAY = 502;

const sharedAgent = new Agent({
  connect: { rejectUnauthorized: false },
});

const assertStatus200 = (statusCode) => {
  if (statusCode !== 200) {
    const err = new Error(`Backend returned ${statusCode}`);
    err.statusCode = statusCode;
    throw err;
  }
};

const run = (configuration, logger) => {
  const instance = fastify();
  const cache = createCache({ ttl: CACHE_TTL_SECONDS });

  cache.define("albumart", async (url) => {
    const { statusCode, headers, body } = await request(url, {
      method: "GET",
      headers: { [HEADER_API_KEY]: configuration.getApiKey() },
      dispatcher: sharedAgent,
    });

    assertStatus200(statusCode);
    const data = Buffer.from(await body.arrayBuffer());
    return { contentType: headers["content-type"], data };
  });

  cache.define("browse", async (path) => {
    const { statusCode, body } = await request(
      `${configuration.getServerUrl()}/music/browse`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [HEADER_API_KEY]: configuration.getApiKey(),
        },
        body: JSON.stringify({ path }),
        dispatcher: sharedAgent,
      },
    );
    assertStatus200(statusCode);
    return await body.json();
  });

  cache.define(
    "search",
    { serialize: ({ query, category }) => `${query}::${category}` },
    async ({ query, category }) => {
      const { statusCode, body } = await request(
        `${configuration.getServerUrl()}/music/search`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            [HEADER_API_KEY]: configuration.getApiKey(),
          },
          body: JSON.stringify({ query, category }),
          dispatcher: sharedAgent,
        },
      );
      assertStatus200(statusCode);
      return await body.json();
    },
  );

  logger.info("Setting up Fastify Routes");

  instance.route({
    method: "GET",
    url: "/music/stream",
    handler: async (req, res) => {
      const urlPart = req.url.substring(req.url.indexOf("/music"));
      const serverFullUrl = `${configuration.getServerUrl()}${urlPart}`;

      const reqHeaders = { [HEADER_API_KEY]: configuration.getApiKey() };
      if (req.headers["range"]) {
        reqHeaders["range"] = req.headers["range"];
      }

      const { statusCode, headers, body } = await request(serverFullUrl, {
        method: "GET",
        headers: reqHeaders,
        dispatcher: sharedAgent,
      });

      res.code(statusCode);
      if (headers["content-type"])
        res.header("content-type", headers["content-type"]);
      if (headers["content-length"])
        res.header("content-length", headers["content-length"]);
      if (headers["accept-ranges"])
        res.header("accept-ranges", headers["accept-ranges"]);
      return res.send(body);
    },
  });

  instance.route({
    method: "GET",
    url: "/music/albumart",
    handler: async (req, res) => {
      const urlPart = req.url.substring(req.url.indexOf("/music"));
      const serverFullUrl = `${configuration.getServerUrl()}${urlPart}`;
      try {
        const { contentType, data } = await cache.albumart(serverFullUrl);
        if (contentType) res.header("content-type", contentType);
        return res.send(data);
      } catch (err) {
        return res.code(err.statusCode || HTTP_ERROR_BAD_GATEWAY).send();
      }
    },
  });

  instance.route({
    method: "POST",
    url: "/music/browse",
    handler: async (req, res) => {
      const { path } = req.body || {};
      if (!path) return res.code(HTTP_ERROR_BAD_REQUEST).send();
      try {
        const data = await cache.browse(path);
        return res.send(data);
      } catch (err) {
        return res.code(err.statusCode || HTTP_ERROR_BAD_GATEWAY).send();
      }
    },
  });

  instance.route({
    method: "POST",
    url: "/music/search",
    handler: async (req, res) => {
      const { query, category } = req.body || {};
      if (!query || !category) return res.code(HTTP_ERROR_BAD_REQUEST).send();
      try {
        const data = await cache.search({ query, category });
        return res.send(data);
      } catch (err) {
        return res.code(err.statusCode || HTTP_ERROR_BAD_GATEWAY).send();
      }
    },
  });

  logger.info("Starting Fastify listening");
  instance.listen({ port: musicProxyPort }, (err) => {
    if (err)
      logger.error(
        `[musicProxy] Failed to bind port ${musicProxyPort}: ${err.message}`,
      );
  });

  return instance;
};

const kill = async (instance) => {
  await instance.close();
};

module.exports.run = run;
module.exports.kill = kill;
