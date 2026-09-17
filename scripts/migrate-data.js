require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../src/db/pool");

async function main() {
  const file = path.resolve(__dirname, "..", "data", "database.json");
  if (!fs.existsSync(file)) { console.log("Nenhum data/database.json encontrado, nada para migrar."); return; }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const user of data.users || []) {
    await pool.query(
      `insert into users (id, name, email, password_hash, role, created_at)
       values ($1, $2, $3, $4, $5, $6) on conflict (id) do nothing`,
      [user.id, user.name, user.email.toLowerCase(), user.passwordHash, user.role, user.createdAt]
    );
  }

  for (const team of data.teams || []) {
    const result = await pool.query(
      `insert into teams (id, name, responsible, phone, email, payment, status, payment_status, access_token, champion, position, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) on conflict (id) do nothing returning id`,
      [team.id, team.name, team.responsible, team.phone, team.email, team.payment, team.status, team.paymentStatus || "pending", team.accessToken, Boolean(team.champion), team.position || null, team.createdAt, team.updatedAt || null]
    );
    if (result.rowCount === 0) continue;
    let order = 0;
    for (const player of team.players || []) {
      order += 1;
      await pool.query(
        `insert into players (team_id, sort_order, name, phone) values ($1, $2, $3, $4)`,
        [team.id, order, player.name, player.phone]
      );
    }
  }

  console.log(`Migrado: ${(data.users || []).length} usuário(s), ${(data.teams || []).length} time(s).`);
  await pool.end();
}

main().catch(error => { console.error(error); process.exit(1); });
