const TeamModel = require("../models/team.model");
const MatchModel = require("../models/match.model");
const MatchStatsModel = require("../models/match-stats.model");
const { send, sendJson, redirect, parseBody } = require("../utils/http");
const { render } = require("../views/layout");

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }

const STAT_FIELDS = [
  { key: "goals", label: "Gols" },
  { key: "penaltyGoals", label: "Gols pên." },
  { key: "shotsOnTarget", label: "Fin. no alvo" },
  { key: "shotsOffTarget", label: "Fin. pra fora" },
  { key: "assists", label: "Assistências" },
  { key: "saves", label: "Defesas simples" },
  { key: "difficultSaves", label: "Defesas difíceis" },
  { key: "goalsConceded", label: "Gols sofridos" },
  { key: "tackles", label: "Desarmes" },
  { key: "interceptions", label: "Interceptações" },
  { key: "foulsCommitted", label: "Faltas cometidas" },
  { key: "foulsSuffered", label: "Faltas sofridas" },
  { key: "penaltiesCommitted", label: "Pênaltis cometidos" },
  { key: "penaltiesSuffered", label: "Pênaltis sofridos" },
  { key: "yellowCards", label: "Cartão amarelo" },
  { key: "redCards", label: "Cartão vermelho" }
];
const ROUNDS = ["Oitavas de final", "Quartas de final", "Semifinal", "Final"];

function playerRow(player, team, existingByPlayer) {
  const stat = existingByPlayer.get(player.id);
  const cell = key => `<td><input type="number" min="0" name="${key}[${player.id}]" value="${stat ? stat[key] : 0}"></td>`;
  return `<tr><td>${escapeHtml(player.name || "—")}<small>${escapeHtml(team.name)}${player.former ? " · saiu do time" : ""}</small></td><td><input type="checkbox" name="played[${player.id}]" value="1" ${stat ? "checked" : ""}></td><td><input type="checkbox" name="goalkeeper[${player.id}]" value="1" ${stat?.isGoalkeeper ? "checked" : ""}></td><td><input type="checkbox" name="mvp[${player.id}]" value="1" ${stat?.mvp ? "checked" : ""}></td>${STAT_FIELDS.map(field => cell(field.key)).join("")}</tr>`;
}
function rosterWithFormerPlayers(team, teamId, existing) {
  const knownIds = new Set(team.players.map(player => player.id));
  const former = existing
    .filter(stat => stat.teamId === teamId && !knownIds.has(stat.playerId))
    .map(stat => ({ id: stat.playerId, name: stat.playerName, phone: "", former: true }));
  return { ...team, players: [...team.players, ...former] };
}
function statsTableHtml(homeTeam, awayTeam, existing) {
  const existingByPlayer = new Map(existing.map(stat => [stat.playerId, stat]));
  const rows = homeTeam.players.map(player => playerRow(player, homeTeam, existingByPlayer)).join("")
    + awayTeam.players.map(player => playerRow(player, awayTeam, existingByPlayer)).join("");
  const headers = `<th>Jogador</th><th>Em campo</th><th>Goleiro</th><th>MVP</th>${STAT_FIELDS.map(field => `<th>${field.label}</th>`).join("")}`;
  return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}
function teamOptionsHtml(teams) {
  return teams.map(team => `<option value="${team.id}">${escapeHtml(team.name)}</option>`).join("");
}
function roundOptionsHtml() {
  return ROUNDS.map(round => `<option value="${round}">${round}</option>`).join("");
}

const MatchController = {
  async create(request, response) {
    const body = await parseBody(request);
    if (!body.round || !body.homeTeamId || !body.awayTeamId) return sendJson(response, 400, { error: "Informe a rodada e os dois times." });
    const match = await MatchModel.create({ round: body.round, homeTeamId: body.homeTeamId, awayTeamId: body.awayTeamId });
    redirect(response, `/admin/partidas/${match.id}`);
  },
  async detail(request, response, id) {
    const match = await MatchModel.findById(id);
    if (!match || !match.home || !match.away) return send(response, 404, "Partida não encontrada.");
    const [homeTeam, awayTeam, existing] = await Promise.all([
      TeamModel.findById(match.home.id),
      TeamModel.findById(match.away.id),
      MatchStatsModel.listByMatch(id)
    ]);
    const homeRoster = rosterWithFormerPlayers(homeTeam, match.home.id, existing);
    const awayRoster = rosterWithFormerPlayers(awayTeam, match.away.id, existing);
    send(response, 200, render("match-detail", {
      matchId: match.id,
      round: escapeHtml(match.round),
      homeTeamName: escapeHtml(homeTeam.name),
      awayTeamName: escapeHtml(awayTeam.name),
      homeScore: match.homeScore ?? "",
      awayScore: match.awayScore ?? "",
      finishedChecked: match.status === "finished" ? "checked" : "",
      statsTable: statsTableHtml(homeRoster, awayRoster, existing)
    }));
  },
  async save(request, response, id) {
    const match = await MatchModel.findById(id);
    if (!match || !match.home || !match.away) return send(response, 404, "Partida não encontrada.");
    const body = await parseBody(request);
    await MatchModel.updateScore(id, {
      homeScore: body.homeScore === "" ? null : Number(body.homeScore),
      awayScore: body.awayScore === "" ? null : Number(body.awayScore),
      status: body.finished === "1" ? "finished" : "scheduled"
    });
    const existing = await MatchStatsModel.listByMatch(id);
    const [homeTeamRaw, awayTeamRaw] = await Promise.all([TeamModel.findById(match.home.id), TeamModel.findById(match.away.id)]);
    const homeTeam = rosterWithFormerPlayers(homeTeamRaw, match.home.id, existing);
    const awayTeam = rosterWithFormerPlayers(awayTeamRaw, match.away.id, existing);
    const players = [...homeTeam.players.map(player => ({ player, team: homeTeam })), ...awayTeam.players.map(player => ({ player, team: awayTeam }))];
    const rows = players
      .filter(({ player }) => body[`played[${player.id}]`] === "1")
      .map(({ player, team }) => {
        const row = { playerId: player.id, teamId: team.id, is_goalkeeper: body[`goalkeeper[${player.id}]`] === "1", mvp: body[`mvp[${player.id}]`] === "1" };
        STAT_FIELDS.forEach(field => { row[toSnake(field.key)] = Math.max(0, Number(body[`${field.key}[${player.id}]`]) || 0); });
        return row;
      });
    await MatchStatsModel.replaceForMatch(id, rows);
    redirect(response, `/admin/partidas/${id}`);
  },
  async newMatchForm() {
    const teams = await TeamModel.list({ status: "approved" });
    return `<form class="result-form" method="post" action="/admin/partidas"><label>Rodada<select name="round">${roundOptionsHtml()}</select></label><label>Time da casa<select name="homeTeamId">${teamOptionsHtml(teams)}</select></label><label>Time visitante<select name="awayTeamId">${teamOptionsHtml(teams)}</select></label><button class="button button-primary">Criar partida</button></form>`;
  }
};
function toSnake(camel) { return camel.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`); }
module.exports = MatchController;
