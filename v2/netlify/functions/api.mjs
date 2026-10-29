import serverless from "serverless-http";
import { server, init } from "../../server-pg.mjs";

let ready = null;
function boot() {
  if (!ready) {
    ready = init().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

const raw = (req, res) => server.emit("request", req, res);

const fn = serverless(raw, {
  binary: false,
  requestId: "x-nf-request-id",
});

export const handler = async (event, context) => {
  await boot();
  let e = event;
  // Netlify rewrites /api/* to /.netlify/functions/api/*. Normalize it back.
  if (e.path && e.path.startsWith("/.netlify/functions/api")) {
    e = { ...e, path: e.path.replace("/.netlify/functions/api", "/api") };
  }
  return fn(e, context);
};
