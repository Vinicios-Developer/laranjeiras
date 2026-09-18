const { randomUUID, randomBytes, scryptSync } = require("crypto");
const { Pool } = require("pg");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const DATABASE_URL = process.env.LOCAL_DATABASE_URL || "postgresql://viniciosgomes@localhost:5432/copa_laranjeiras_dev";

if (!/localhost|127\.0\.0\.1/.test(DATABASE_URL)) {
  console.error("Recusando rodar: essa connection string não parece ser local. Isso aqui é só pra popular um banco de teste.");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });

const TEAM_NAMES = [
  "Laranjeiras FC", "Estrela do Norte", "Amazônia Futsal", "Rio Negro FC", "Unidos da Vila",
  "Leões da Zona Leste", "Furacão FC", "Atlético Laranjeiras", "Real Cidade Nova", "Tigres do Timbiras",
  "Águias da Compensa", "Sporting Manaus", "Vila Buriti FC", "Dínamo do Educandos", "Guerreiros do Norte",
  "Fênix Futsal", "Independente AM", "Coração Amazonense", "Trovão da Zona Sul", "Metropolitano FC",
  "Estrela Azul", "Raízes do Norte", "Panteras FC", "União Laranjeiras"
];
const FIRST_NAMES = ["Gabriel", "Lucas", "Matheus", "Rafael", "Bruno", "Felipe", "Diego", "Thiago", "Rodrigo", "Vinicius", "André", "Caio", "Daniel", "Eduardo", "Fábio", "Gustavo", "Henrique", "Igor", "João", "Kaique", "Leonardo", "Marcelo", "Nathan", "Otávio", "Pedro", "Renan", "Samuel", "Tales", "Victor", "William", "Yuri", "Alan", "Breno", "Cauã", "Davi", "Emerson"];
const LAST_NAMES = ["Silva", "Souza", "Oliveira", "Santos", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Gomes", "Martins", "Araújo", "Melo", "Barros", "Ribeiro", "Fonseca", "Teixeira", "Lopes", "Cardoso"];

function randomItem(list) { return list[Math.floor(Math.random() * list.length)]; }
function randomPhone() { return `929${String(Math.floor(10000000 + Math.random() * 89999999))}`; }
function randomPlayerName() { return `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`; }

async function main() {
  console.log(`Semeando ${DATABASE_URL}...`);
  await pool.query("delete from match_player_stats");
  await pool.query("delete from matches");
  await pool.query("delete from players");
  await pool.query("delete from teams");
  await pool.query("delete from sessions");
  await pool.query("delete from users");

  await pool.query(
    "insert into users (name, email, password_hash, role) values ($1, $2, $3, 'admin')",
    ["Admin Teste", "admin@teste.com", hashPassword("senha1234")]
  );

  for (let index = 0; index < TEAM_NAMES.length; index += 1) {
    const teamId = randomUUID();
    const accessToken = randomBytes(24).toString("hex");
    const paymentOptions = ["avista", "parcelado"];
    const payment = randomItem(paymentOptions);
    const paymentStatusOptions = payment === "avista" ? ["pending", "paid"] : ["pending", "partial", "paid"];
    const paymentStatus = randomItem(paymentStatusOptions);
    const responsible = randomPlayerName();
    const email = `${TEAM_NAMES[index].toLowerCase().replace(/[^a-z0-9]+/g, ".")}@teste.com`;

    await pool.query(
      `insert into teams (id, name, responsible, phone, email, payment, status, payment_status, access_token, created_at)
       values ($1, $2, $3, $4, $5, $6, 'approved', $7, $8, now())`,
      [teamId, TEAM_NAMES[index], responsible, randomPhone(), email, payment, paymentStatus, accessToken]
    );

    const playerCount = 7 + Math.floor(Math.random() * 4); // 7 a 10 jogadores
    for (let slot = 1; slot <= playerCount; slot += 1) {
      await pool.query(
        "insert into players (team_id, sort_order, name, phone) values ($1, $2, $3, $4)",
        [teamId, slot, randomPlayerName(), randomPhone()]
      );
    }
  }

  console.log(`Pronto: ${TEAM_NAMES.length} times aprovados com jogadores criados.`);
  console.log("Login admin de teste: admin@teste.com / senha1234");
  await pool.end();
}

main().catch(error => { console.error(error); process.exit(1); });
