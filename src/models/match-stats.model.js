const { query } = require("./database");

const FIELDS = [
  "is_goalkeeper", "mvp", "goals", "penalty_goals", "shots_on_target", "shots_off_target",
  "assists", "saves", "difficult_saves", "goals_conceded", "tackles", "interceptions",
  "fouls_committed", "fouls_suffered", "penalties_committed", "penalties_suffered", "yellow_cards", "red_cards"
];

function toStat(row) {
  return {
    playerId: row.player_id,
    playerName: row.player_name,
    teamId: row.team_id,
    teamName: row.team_name,
    isGoalkeeper: row.is_goalkeeper,
    mvp: row.mvp,
    goals: row.goals,
    penaltyGoals: row.penalty_goals,
    shotsOnTarget: row.shots_on_target,
    shotsOffTarget: row.shots_off_target,
    assists: row.assists,
    saves: row.saves,
    difficultSaves: row.difficult_saves,
    goalsConceded: row.goals_conceded,
    tackles: row.tackles,
    interceptions: row.interceptions,
    foulsCommitted: row.fouls_committed,
    foulsSuffered: row.fouls_suffered,
    penaltiesCommitted: row.penalties_committed,
    penaltiesSuffered: row.penalties_suffered,
    yellowCards: row.yellow_cards,
    redCards: row.red_cards
  };
}

const MatchStatsModel = {
  async listByMatch(matchId) {
    const { rows } = await query(
      `select s.*, p.name as player_name, t.name as team_name
       from match_player_stats s
       join players p on p.id = s.player_id
       join teams t on t.id = s.team_id
       where s.match_id = $1
       order by t.name, p.sort_order`,
      [matchId]
    );
    return rows.map(toStat);
  },
  async replaceForMatch(matchId, rows) {
    await query("delete from match_player_stats where match_id = $1", [matchId]);
    for (const row of rows) {
      const values = [matchId, row.teamId, row.playerId, ...FIELDS.map(field => row[field] ?? (field === "is_goalkeeper" || field === "mvp" ? false : 0))];
      const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
      await query(
        `insert into match_player_stats (match_id, team_id, player_id, ${FIELDS.join(", ")}) values (${placeholders})`,
        values
      );
    }
  },
  async leaderboard() {
    const { rows } = await query(
      `select p.id as player_id, p.name as player_name, t.name as team_name,
              sum(s.goals) as goals, sum(s.assists) as assists,
              sum(s.saves) as saves, sum(s.difficult_saves) as difficult_saves,
              sum(s.yellow_cards) as yellow_cards, sum(s.red_cards) as red_cards,
              count(*) filter (where s.mvp) as mvp_count,
              count(*) filter (where s.is_goalkeeper and s.goals_conceded = 0) as clean_sheets
       from match_player_stats s
       join players p on p.id = s.player_id
       join teams t on t.id = s.team_id
       group by p.id, p.name, t.name`,
      []
    );
    return rows.map(row => ({
      playerId: row.player_id,
      playerName: row.player_name,
      teamName: row.team_name,
      goals: Number(row.goals),
      assists: Number(row.assists),
      saves: Number(row.saves),
      difficultSaves: Number(row.difficult_saves),
      yellowCards: Number(row.yellow_cards),
      redCards: Number(row.red_cards),
      mvpCount: Number(row.mvp_count),
      cleanSheets: Number(row.clean_sheets)
    }));
  }
};
module.exports = MatchStatsModel;
