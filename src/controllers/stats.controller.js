const MatchStatsModel = require("../models/match-stats.model");
const { send } = require("../utils/http");
const { render } = require("../views/layout");

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }

function rankingTable(players, valueFn, valueLabel, extra) {
  const ranked = players.filter(player => valueFn(player) > 0).sort((a, b) => valueFn(b) - valueFn(a)).slice(0, 10);
  if (!ranked.length) return '<p class="muted">Ainda sem dados.</p>';
  const rows = ranked.map((player, index) => `<tr><td>${index + 1}º</td><td>${escapeHtml(player.playerName)}<small>${escapeHtml(player.teamName)}</small></td><td>${valueFn(player)}</td>${extra ? extra(player) : ""}</tr>`).join("");
  return `<table><thead><tr><th>#</th><th>Jogador</th><th>${valueLabel}</th>${extra ? '<th>Detalhe</th>' : ""}</tr></thead><tbody>${rows}</tbody></table>`;
}

const StatsController = {
  async index(_, response) {
    const players = await MatchStatsModel.leaderboard();
    const goalsTable = rankingTable(players, player => player.goals, "Gols");
    const assistsTable = rankingTable(players, player => player.assists, "Assistências");
    const savesTable = rankingTable(players, player => player.saves + player.difficultSaves, "Defesas", player => `<td>${player.difficultSaves} difíceis · ${player.cleanSheets} sem sofrer gols</td>`);
    const cardsTable = rankingTable(players, player => player.yellowCards + player.redCards, "Cartões", player => `<td>${player.yellowCards} amarelos · ${player.redCards} vermelhos</td>`);
    const mvpTable = rankingTable(players, player => player.mvpCount, "Vezes craque da partida");
    send(response, 200, render("stats", { goalsTable, assistsTable, savesTable, cardsTable, mvpTable }));
  }
};
module.exports = StatsController;
