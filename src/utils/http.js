const fs = require("fs");
const path = require("path");
const { root } = require("../config");

function send(response, status, body, type = "text/html; charset=utf-8") {
  response.writeHead(status, { "Content-Type": type });
  response.end(body);
}
function sendJson(response, status, body) { send(response, status, JSON.stringify(body), "application/json; charset=utf-8"); }
function sendError(response, status, message) { sendJson(response, status, { error: message }); }
function redirect(response, location) { response.writeHead(302, { Location: location }); response.end(); }
function staticFile(response, relativePath) {
  const file = path.resolve(root, relativePath);
  if (!file.startsWith(root)) return false;
  if (!fs.existsSync(file)) return false;
  const extension = path.extname(file);
  const contentTypes = { ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(fs.readFileSync(file));
  return true;
}
function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map(value => {
    const [key, ...parts] = value.trim().split("="); return [key, decodeURIComponent(parts.join("="))];
  }));
}
function parseBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", chunk => { raw += chunk; if (raw.length > 1e6) reject(new Error("Requisição muito grande.")); });
    request.on("end", () => {
      try {
        if (!raw) return resolve({});
        if ((request.headers["content-type"] || "").includes("application/x-www-form-urlencoded")) return resolve(Object.fromEntries(new URLSearchParams(raw)));
        resolve(JSON.parse(raw));
      } catch { reject(new Error("Corpo da requisição inválido.")); }
    });
    request.on("error", reject);
  });
}
module.exports = { send, sendJson, sendError, redirect, staticFile, parseCookies, parseBody };
