const { parseCookies, redirect, sendError } = require("../utils/http");
const UserModel = require("../models/user.model");
const SessionModel = require("../models/session.model");
const { sessionTtl } = require("../config");

async function createSession(user) {
  return SessionModel.create(user.id);
}
async function currentUser(request) {
  const token = parseCookies(request).session;
  if (!token) return null;
  const userId = await SessionModel.findUserId(token);
  if (!userId) return null;
  return (await UserModel.findById(userId)) || null;
}
async function destroySession(request) {
  const token = parseCookies(request).session;
  if (!token) return;
  await SessionModel.destroy(token);
}
async function requireAuth(request, response) { const user = await currentUser(request); if (!user) { redirect(response, "/login"); return null; } return user; }
async function requireRole(request, response, roles) { const user = await requireAuth(request, response); if (user && !roles.includes(user.role)) { sendError(response, 403, "Você não tem permissão para esta operação."); return null; } return user; }
function sessionCookie(token) { return `session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(sessionTtl / 1000)}`; }
module.exports = { createSession, currentUser, destroySession, requireAuth, requireRole, sessionCookie };
