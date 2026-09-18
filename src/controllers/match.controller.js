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
const SLOTS = [
  { key: "GK", label: "Goleiro", top: "88%", left: "50%" },
  { key: "FIX", label: "Fixo", top: "66%", left: "50%" },
  { key: "ALE", label: "Ala esq.", top: "42%", left: "20%" },
  { key: "ALD", label: "Ala dir.", top: "42%", left: "80%" },
  { key: "PIV", label: "Pivô", top: "16%", left: "50%" }
];

function badgeText({ played, goals, assists, yellowCards, redCards, mvp, isGoalkeeper }) {
  if (!played) return "Não lançado";
  const parts = [];
  if (isGoalkeeper) parts.push("🧤");
  if (goals) parts.push(`⚽${goals}`);
  if (assists) parts.push(`🎯${assists}`);
  if (yellowCards) parts.push(`🟨${yellowCards}`);
  if (redCards) parts.push(`🟥${redCards}`);
  if (mvp) parts.push("⭐");
  return parts.length ? parts.join(" ") : "Em campo";
}
function playerDialog(player, stat) {
  const played = Boolean(stat);
  const isGoalkeeper = stat ? stat.isGoalkeeper : Boolean(player.isGoalkeeper);
  const dialogId = `dlg-${player.id}`;
  const badgeId = `badge-${player.id}`;
  const fields = STAT_FIELDS.map(field => `<label>${field.label}<input type="number" min="0" name="${field.key}[${player.id}]" value="${stat ? stat[field.key] : 0}"></label>`).join("");
  const badge = badgeText({ played, goals: stat?.goals || 0, assists: stat?.assists || 0, yellowCards: stat?.yellowCards || 0, redCards: stat?.redCards || 0, mvp: stat?.mvp || false, isGoalkeeper });
  return `<dialog id="${dialogId}" class="stat-modal" data-badge="${badgeId}"><div class="stat-modal-head"><h3>${escapeHtml(player.name || "—")}<span class="player-card-badges" id="${badgeId}">${badge}</span></h3><button type="button" class="stat-modal-close" data-close>✕</button></div><div class="stat-modal-toggles"><label><input type="checkbox" name="played[${player.id}]" value="1" ${played ? "checked" : ""}> Em campo</label><label><input type="checkbox" name="goalkeeper[${player.id}]" value="1" ${isGoalkeeper ? "checked" : ""}> 🧤 Goleiro</label><label><input type="checkbox" name="mvp[${player.id}]" value="1" ${stat?.mvp ? "checked" : ""}> ⭐ MVP</label></div><div class="stat-modal-grid">${fields}</div><button type="button" class="button button-primary full" data-close>Salvar e fechar</button></dialog>`;
}
function rosterWithFormerPlayers(team, teamId, existing) {
  const knownIds = new Set(team.players.map(player => player.id));
  const former = existing
    .filter(stat => stat.teamId === teamId && !knownIds.has(stat.playerId))
    .map(stat => ({ id: stat.playerId, name: stat.playerName, phone: "", isGoalkeeper: stat.isGoalkeeper, former: true }));
  return { ...team, players: [...team.players, ...former] };
}
function assignLineup(team, existingByPlayer) {
  const starters = {};
  const usedIds = new Set();
  SLOTS.forEach(slot => {
    const player = team.players.find(candidate => existingByPlayer.get(candidate.id)?.positionSlot === slot.key);
    if (player) { starters[slot.key] = player; usedIds.add(player.id); }
  });
  const openSlots = SLOTS.map(slot => slot.key).filter(key => !starters[key]);
  if (openSlots.length) {
    const available = team.players.filter(player => !usedIds.has(player.id));
    if (openSlots.includes("GK")) {
      const goalkeeperIndex = available.findIndex(player => player.isGoalkeeper);
      if (goalkeeperIndex !== -1) {
        const goalkeeper = available.splice(goalkeeperIndex, 1)[0];
        starters.GK = goalkeeper;
        usedIds.add(goalkeeper.id);
        openSlots.splice(openSlots.indexOf("GK"), 1);
      }
    }
    openSlots.forEach(key => {
      const next = available.shift();
      if (next) { starters[key] = next; usedIds.add(next.id); }
    });
  }
  const reserves = team.players.filter(player => !usedIds.has(player.id));
  return { starters, reserves };
}
function playerOptionsHtml(players, selectedId) {
  const blank = selectedId ? "" : `<option value="">—</option>`;
  return blank + players.map(player => `<option value="${player.id}" ${player.id === selectedId ? "selected" : ""}>${escapeHtml(player.name || "—")}</option>`).join("");
}
function pitchSectionHtml(title, team, teamKey, existingByPlayer) {
  const lineup = assignLineup(team, existingByPlayer);
  const dialogs = team.players.map(player => playerDialog(player, existingByPlayer.get(player.id))).join("");
  const slots = SLOTS.map(slot => {
    const player = lineup.starters[slot.key];
    return `<div class="pitch-slot" style="top:${slot.top};left:${slot.left}" data-slot="${slot.key}"><span class="pitch-slot-label">${slot.label}</span><select class="pitch-select" data-team="${teamKey}" data-slot="${slot.key}">${playerOptionsHtml(team.players, player?.id)}</select><button type="button" class="pitch-stat-btn" data-dialog="${player ? `dlg-${player.id}` : ""}" ${player ? "" : "disabled"}>⚽</button></div>`;
  }).join("");
  const hiddenInputs = team.players.map(player => {
    const slot = SLOTS.find(candidate => lineup.starters[candidate.key]?.id === player.id);
    return `<input type="hidden" id="position-${player.id}" name="position[${player.id}]" value="${slot ? slot.key : ""}">`;
  }).join("");
  const reserveChips = lineup.reserves.map(player => `<button type="button" class="reserve-chip" data-dialog="dlg-${player.id}">${escapeHtml(player.name || "—")}${player.former ? " · saiu" : ""}</button>`).join("")
    || '<p class="muted reserves-empty">Sem reservas.</p>';
  const playersJson = escapeHtml(JSON.stringify(team.players.map(player => ({ id: player.id, name: player.name || "—" }))));
  return `<div class="match-team-section"><h3>${title} <span>${escapeHtml(team.name)}</span></h3><div class="pitch-block" data-team="${teamKey}" data-players="${playersJson}"><div class="pitch">${slots}</div>${hiddenInputs}<div class="reserves"><p class="reserves-title">Reservas</p><div class="reserve-chips">${reserveChips}</div></div></div>${dialogs}</div>`;
}
function matchPlayersHtml(homeTeam, awayTeam, existing) {
  const existingByPlayer = new Map(existing.map(stat => [stat.playerId, stat]));
  return pitchSectionHtml("Time da casa ·", homeTeam, "home", existingByPlayer) + pitchSectionHtml("Time visitante ·", awayTeam, "away", existingByPlayer);
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
      matchPlayers: matchPlayersHtml(homeRoster, awayRoster, existing)
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
      .filter(({ player }) => body[`played[${player.id}]`] === "1" || body[`position[${player.id}]`])
      .map(({ player, team }) => {
        const positionSlot = body[`position[${player.id}]`] || null;
        const row = { playerId: player.id, teamId: team.id, is_goalkeeper: body[`goalkeeper[${player.id}]`] === "1", mvp: body[`mvp[${player.id}]`] === "1", position_slot: positionSlot };
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
