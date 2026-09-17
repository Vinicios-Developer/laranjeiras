const AuthService = require("../services/auth.service");
const { createSession, destroySession, sessionCookie } = require("../middleware/auth.middleware");
const { redirect, parseBody, sendJson } = require("../utils/http");
const AuthController = {
  async login(request, response) {
    try { const user = await AuthService.login(await parseBody(request)); response.writeHead(302, { Location: "/admin", "Set-Cookie": sessionCookie(await createSession(user)) }); response.end(); }
    catch (error) { response.writeHead(302, { Location: `/login?error=${encodeURIComponent(error.message)}` }); response.end(); }
  },
  async register(request, response) {
    try { await AuthService.register(await parseBody(request)); redirect(response, "/login"); }
    catch (error) { sendJson(response, error.statusCode || 400, { error: error.message }); }
  },
  async logout(request, response) {
    await destroySession(request);
    response.writeHead(302, { Location: "/", "Set-Cookie": "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
    response.end();
  }
};
module.exports = AuthController;
