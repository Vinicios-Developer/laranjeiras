const { randomUUID } = require("crypto");
const { query } = require("./database");

function toTeamRef(id, name) {
  return id ? { id, name } : null;
}
function toMatch(row) {
  return {
    id: row.id,
    round: row.round,
    position: row.position,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    home: toTeamRef(row.home_id, row.home_name),
    away: toTeamRef(row.away_id, row.away_name)
  };
}
const selectMatches = `select m.id, m.round, m.position, m.status, m.home_score, m.away_score,
              home.id as home_id, home.name as home_name,
              away.id as away_id, away.name as away_name
       from matches m
       left join teams home on home.id = m.home_team_id
       left join teams away on away.id = m.away_team_id`;

const MatchModel = {
  async replaceRound(round, matches) {
    await query("delete from matches where round = $1", [round]);
    for (const match of matches) {
      await query(
        "insert into matches (id, round, position, home_team_id, away_team_id, status) values ($1, $2, $3, $4, $5, $6)",
        [match.id, match.round, match.position, match.home?.id || null, match.away?.id || null, match.status]
      );
    }
    return this.list();
  },
  async list() {
    const { rows } = await query(`${selectMatches} order by m.round, m.position`, []);
    return rows.map(toMatch);
  },
  async findById(id) {
    const { rows } = await query(`${selectMatches} where m.id = $1`, [id]);
    return rows[0] ? toMatch(rows[0]) : undefined;
  },
  async create({ round, homeTeamId, awayTeamId }) {
    const { rows } = await query("select coalesce(max(position), 0) + 1 as next from matches where round = $1", [round]);
    const id = randomUUID();
    await query(
      "insert into matches (id, round, position, home_team_id, away_team_id, status) values ($1, $2, $3, $4, $5, 'scheduled')",
      [id, round, rows[0].next, homeTeamId, awayTeamId]
    );
    return this.findById(id);
  },
  async updateScore(id, { homeScore, awayScore, status }) {
    await query(
      "update matches set home_score = $2, away_score = $3, status = $4 where id = $1",
      [id, homeScore, awayScore, status]
    );
    return this.findById(id);
  }
};
module.exports = MatchModel;
