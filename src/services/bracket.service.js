const MatchModel = require("../models/match.model");
const TeamModel = require("../models/team.model");
const { AppError } = require("../utils/errors");
async function generateBracket() {
  const teams = await TeamModel.list({ status: "approved" });
  if (teams.length < 2) throw new AppError("É necessário ter pelo menos 2 times confirmados para gerar o chaveamento.");
  const ordered = teams.slice(0, 24);
  const matches = [];
  for (let index = 0; index < ordered.length; index += 2) {
    matches.push({ id: `match-${index / 2 + 1}`, round: "Oitavas de final", position: index / 2 + 1, home: ordered[index], away: ordered[index + 1] || null, status: "scheduled" });
  }
  return MatchModel.replaceAll(matches);
}
module.exports = { generateBracket };
