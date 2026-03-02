const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const scheduleHandler = require("./api/schedule.js");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

    if (requestUrl.pathname === "/api/schedule") {
      await handleScheduleApi(requestUrl, res);
      return;
    }

    await serveStatic(requestUrl.pathname, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: "dev_server_error",
        message: error instanceof Error ? error.message : String(error),
      })
    );
  }
});

server.listen(PORT, HOST, () => {
  const urls = new Set([`http://localhost:${PORT}`]);

  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry && entry.family === "IPv4" && !entry.internal) {
        urls.add(`http://${entry.address}:${PORT}`);
      }
    }
  }

  console.log("Dev server started:");
  for (const url of urls) {
    console.log(`- ${url}`);
  }
});

async function handleScheduleApi(requestUrl, res) {
  const query = {};
  for (const [key, value] of requestUrl.searchParams.entries()) {
    query[key] = value;
  }

  const reqLike = { query };

  const resLike = {
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    status(code) {
      res.statusCode = code;
      return resLike;
    },
    send(body) {
      if (!res.getHeader("Content-Type")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(body);
    },
  };

  await scheduleHandler(reqLike, resLike);
}

async function serveStatic(pathname, res) {
  let relativePath = pathname;

  if (relativePath === "/") {
    relativePath = "/index.html";
  }

  const safe = path.normalize(relativePath).replace(/^([/\\]?\.{1,2}[/\\])+/, "");
  const absolutePath = path.resolve(ROOT, `.${path.sep}${safe}`);

  if (!absolutePath.startsWith(ROOT)) {
    notFound(res);
    return;
  }

  try {
    const stat = await fs.promises.stat(absolutePath);

    if (stat.isDirectory()) {
      notFound(res);
      return;
    }

    const ext = path.extname(absolutePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    fs.createReadStream(absolutePath).pipe(res);
  } catch {
    notFound(res);
  }
}

function notFound(res) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not Found");
}
