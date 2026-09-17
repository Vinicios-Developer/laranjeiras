const crypto = require("crypto");
const { query } = require("./database");
const { sessionTtl } = require("../config");

function hash(token) { return crypto.createHash("sha256").update(token).digest("hex"); }

const SessionModel = {
  async create(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + sessionTtl);
    await query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [hash(token), userId, expiresAt]);
    return token;
  },
  async findUserId(token) {
    const key = hash(token);
    const { rows } = await query("select user_id, expires_at from sessions where token_hash = $1", [key]);
    const session = rows[0];
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      await query("delete from sessions where token_hash = $1", [key]);
      return null;
    }
    return session.user_id;
  },
  async destroy(token) {
    await query("delete from sessions where token_hash = $1", [hash(token)]);
  }
};
module.exports = SessionModel;
