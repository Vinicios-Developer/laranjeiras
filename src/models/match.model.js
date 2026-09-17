const { query } = require("./database");

function toTeamRef(id, name) {
  return id ? { id, name } : null;
}

const MatchModel = {
  async replaceAll(matches) {
    await query("delete from matches", []);
    for (const match of matches) {
      await query(
        "insert into matches (id, round, position, home_team_id, away_team_id, status) values ($1, $2, $3, $4, $5, $6)",
        [match.id, match.round, match.position, match.home?.id || null, match.away?.id || null, match.status]
      );
    }
    return this.list();
  },
  async list() {
    const { rows } = await query(
      `select m.id, m.round, m.position, m.status,
              home.id as home_id, home.name as home_name,
              away.id as away_id, away.name as away_name
       from matches m
       left join teams home on home.id = m.home_team_id
       left join teams away on away.id = m.away_team_id
       order by m.position`,
      []
    );
    return rows.map(row => ({
      id: row.id,
      round: row.round,
      position: row.position,
      status: row.status,
      home: toTeamRef(row.home_id, row.home_name),
      away: toTeamRef(row.away_id, row.away_name)
    }));
  }
};
module.exports = MatchModel;
