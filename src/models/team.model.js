const { randomUUID } = require("crypto");
const { query } = require("./database");

function toTeam(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    responsible: row.responsible,
    phone: row.phone,
    email: row.email,
    payment: row.payment,
    status: row.status,
    paymentStatus: row.payment_status,
    accessToken: row.access_token,
    champion: row.champion,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function attachPlayers(team) {
  if (!team) return team;
  const { rows } = await query("select id, name, phone from players where team_id = $1 and active = true order by sort_order", [team.id]);
  team.players = rows;
  return team;
}
async function replacePlayers(teamId, players) {
  await query("delete from players where team_id = $1", [teamId]);
  let order = 0;
  for (const player of players) {
    order += 1;
    await query("insert into players (team_id, sort_order, name, phone) values ($1, $2, $3, $4)", [teamId, order, player.name, player.phone]);
  }
}
async function upsertPlayers(teamId, entries) {
  let order = 0;
  for (const entry of entries) {
    const name = String(entry.name || "").trim();
    const phone = String(entry.phone || "").trim();
    const isEmpty = !name && !phone;
    if (entry.id && entry.left) {
      await query("update players set active = false where id = $1 and team_id = $2", [entry.id, teamId]);
      if (!isEmpty) {
        order += 1;
        await query("insert into players (team_id, sort_order, name, phone) values ($1, $2, $3, $4)", [teamId, order, name, phone]);
      }
      continue;
    }
    if (entry.id && isEmpty) {
      await query("update players set active = false where id = $1 and team_id = $2", [entry.id, teamId]);
      continue;
    }
    if (entry.id) {
      order += 1;
      await query("update players set name = $1, phone = $2, sort_order = $3 where id = $4 and team_id = $5", [name, phone, order, entry.id, teamId]);
      continue;
    }
    if (!isEmpty) {
      order += 1;
      await query("insert into players (team_id, sort_order, name, phone) values ($1, $2, $3, $4)", [teamId, order, name, phone]);
    }
  }
}

const TeamModel = {
  async list(filters = {}) {
    const conditions = [];
    const params = [];
    if (filters.status) { params.push(filters.status); conditions.push(`status = $${params.length}`); }
    if (filters.query) { params.push(`%${filters.query.toLowerCase()}%`); conditions.push(`lower(name) like $${params.length}`); }
    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    const { rows } = await query(`select * from teams ${where} order by created_at desc`, params);
    return Promise.all(rows.map(row => attachPlayers(toTeam(row))));
  },
  async findById(id) {
    const { rows } = await query("select * from teams where id = $1", [id]);
    return attachPlayers(toTeam(rows[0]));
  },
  async findByAccess(email, phone) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phone || "").replace(/\D/g, "");
    const { rows } = await query(
      "select * from teams where lower(trim(email)) = $1 and regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $2",
      [normalizedEmail, normalizedPhone]
    );
    return attachPlayers(toTeam(rows[0]));
  },
  async create(data) {
    const accessToken = data.accessToken || randomUUID();
    const { rows } = await query(
      `insert into teams (id, name, responsible, phone, email, payment, payment_status, access_token, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') returning *`,
      [randomUUID(), data.name, data.responsible, data.phone, data.email, data.payment, data.paymentStatus || "pending", accessToken]
    );
    const team = toTeam(rows[0]);
    await replacePlayers(team.id, data.players || []);
    return attachPlayers(team);
  },
  async updatePlayers(id, entries) {
    const team = await this.findById(id);
    if (!team) return null;
    await upsertPlayers(id, entries);
    await query("update teams set updated_at = now() where id = $1", [id]);
    return this.findById(id);
  },
  async updatePayment(id, payment) {
    const { rows } = await query("update teams set payment_status = $2, updated_at = now() where id = $1 returning *", [id, payment]);
    return attachPlayers(toTeam(rows[0]));
  },
  async updatePaymentStatus(id, paymentStatus) {
    if (!["pending", "partial", "paid"].includes(paymentStatus)) return null;
    return this.updatePayment(id, paymentStatus);
  },
  async updateStatus(id, status) {
    const { rows } = await query("update teams set status = $2 where id = $1 returning *", [id, status]);
    return attachPlayers(toTeam(rows[0]));
  },
  async updateResult(id, result) {
    const { rows } = await query(
      "update teams set champion = $2, position = $3, updated_at = now() where id = $1 returning *",
      [id, Boolean(result.champion), result.position ? Number(result.position) : null]
    );
    return attachPlayers(toTeam(rows[0]));
  }
};
module.exports = TeamModel;
