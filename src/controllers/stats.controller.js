const MatchStatsModel = require("../models/match-stats.model");
const config = require("../config");
const { send } = require("../utils/http");
const { render } = require("../views/layout");

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }
function isStatsAvailable() { return new Date() >= new Date(config.tournament.date); }
function lockedBodyHtml() {
  return `<section class="section intro" id="stats-intro"><p class="eyebrow">Estatísticas</p><div class="intro-grid"><h2>As estatísticas <span>estreiam</span> no dia da Copa.</h2><div><p>Artilharia, assistências, defesas e cartões ficam disponíveis aqui a partir de domingo, 18 de outubro — quando a bola rolar. Até lá, prepara o time!</p><a class="button button-primary" href="/inscricao">Quero inscrever meu time <b>→</b></a></div></div></section>`;
}
function openBodyHtml({ goalsTable, assistsTable, savesTable, cardsTable, mvpTable }) {
  return `<section class="section intro" id="stats-intro"><p class="eyebrow">Estatísticas</p><div class="intro-grid"><h2>Quem está <span>brilhando</span> na Copa.</h2><div><p>Números somados de todas as partidas já lançadas pela organização. Atualizado conforme os jogos acontecem.</p></div></div></section><section class="section stats-grid"><div class="table-card"><h3>⚽ Artilheiros</h3>${goalsTable}</div><div class="table-card"><h3>🎯 Assistências</h3>${assistsTable}</div><div class="table-card"><h3>🧤 Defesas</h3>${savesTable}</div><div class="table-card"><h3>🟨 Cartões</h3>${cardsTable}</div><div class="table-card"><h3>🏅 Craque da partida</h3>${mvpTable}</div></section>`;
}

function rankingTable(players, valueFn, valueLabel, extra) {
  const ranked = players.filter(player => valueFn(player) > 0).sort((a, b) => valueFn(b) - valueFn(a)).slice(0, 10);
  if (!ranked.length) return '<p class="muted">Ainda sem dados.</p>';
  const rows = ranked.map((player, index) => `<tr><td>${index + 1}º</td><td>${escapeHtml(player.playerName)}<small>${escapeHtml(player.teamName)}</small></td><td>${valueFn(player)}</td>${extra ? extra(player) : ""}</tr>`).join("");
  return `<table><thead><tr><th>#</th><th>Jogador</th><th>${valueLabel}</th>${extra ? '<th>Detalhe</th>' : ""}</tr></thead><tbody>${rows}</tbody></table>`;
}

const StatsController = {
  async index(_, response) {
    if (!isStatsAvailable()) return send(response, 200, render("stats", { body: lockedBodyHtml() }));
    const players = await MatchStatsModel.leaderboard();
    const goalsTable = rankingTable(players, player => player.goals, "Gols");
    const assistsTable = rankingTable(players, player => player.assists, "Assistências");
    const savesTable = rankingTable(players, player => player.saves + player.difficultSaves, "Defesas", player => `<td>${player.difficultSaves} difíceis · ${player.cleanSheets} sem sofrer gols</td>`);
    const cardsTable = rankingTable(players, player => player.yellowCards + player.redCards, "Cartões", player => `<td>${player.yellowCards} amarelos · ${player.redCards} vermelhos</td>`);
    const mvpTable = rankingTable(players, player => player.mvpCount, "Vezes craque da partida");
    send(response, 200, render("stats", { body: openBodyHtml({ goalsTable, assistsTable, savesTable, cardsTable, mvpTable }) }));
  }
};
module.exports = StatsController;
module.exports.isStatsAvailable = isStatsAvailable;
