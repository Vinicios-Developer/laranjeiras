const { query } = require("./database");

function toUser(row) {
  if (!row) return undefined;
  return { id: row.id, name: row.name, email: row.email, passwordHash: row.password_hash, role: row.role, createdAt: row.created_at };
}

const UserModel = {
  async findByEmail(email) {
    const { rows } = await query("select * from users where email = $1", [String(email || "").toLowerCase()]);
    return toUser(rows[0]);
  },
  async findById(id) {
    const { rows } = await query("select * from users where id = $1", [id]);
    return toUser(rows[0]);
  },
  async count() {
    const { rows } = await query("select count(*)::int as count from users");
    return rows[0].count;
  },
  async create({ name, email, passwordHash, role = "organizer" }) {
    const { rows } = await query(
      "insert into users (name, email, password_hash, role) values ($1, $2, $3, $4) returning *",
      [name, email.toLowerCase(), passwordHash, role]
    );
    return toUser(rows[0]);
  }
};
module.exports = UserModel;
