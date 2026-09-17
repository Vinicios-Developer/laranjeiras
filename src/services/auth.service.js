const crypto = require("crypto");
const UserModel = require("../models/user.model");
const { AppError } = require("../utils/errors");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex"); return `${salt}:${hash}`;
}
function verifyPassword(password, stored) { const [salt, hash] = stored.split(":"); return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(crypto.scryptSync(password, salt, 64).toString("hex"), "hex")); }
const AuthService = {
  async register({ name, email, password }) {
    if (!name || !email || !password || password.length < 8) throw new AppError("Informe nome, e-mail e uma senha com pelo menos 8 caracteres.");
    if (await UserModel.findByEmail(email)) throw new AppError("Este e-mail já está cadastrado.");
    const role = (await UserModel.count()) === 0 ? "admin" : "organizer";
    return UserModel.create({ name, email, passwordHash: hashPassword(password), role });
  },
  async login({ email, password }) {
    const user = await UserModel.findByEmail(email || "");
    if (!user || !verifyPassword(password || "", user.passwordHash)) throw new AppError("E-mail ou senha inválidos.", 401);
    return user;
  }
};
module.exports = AuthService;
