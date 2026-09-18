const TeamModel = require("../models/team.model");
const SettingsModel = require("../models/settings.model");
const MatchModel = require("../models/match.model");
const MatchController = require("./match.controller");
const { generateBracket } = require("../services/bracket.service");
const { send, parseBody, redirect } = require("../utils/http");
const { render } = require("../views/layout");
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }
function csv(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
const AdminController = {
  async dashboard(request, response, user) {
    const url = new URL(request.url, "http://localhost"); const query = url.searchParams.get("q") || ""; const status = url.searchParams.get("status") || "";
    const all = await TeamModel.list(); const teams = await TeamModel.list({ query, status });
    const authorizedLimit = (await SettingsModel.get()).authorizedTeamLimit;
    const approved = all.filter(item => item.status === "approved").length;
    const pending = all.filter(item => item.status === "pending").length;
    const paid = all.filter(item => item.paymentStatus === "paid").length;
    const expectedRevenue = all.length * 250;
    const collectedRevenue = all.reduce((total, item) => total + (item.paymentStatus === "paid" ? 250 : item.paymentStatus === "partial" ? 125 : 0), 0);
    const paymentLabel = { paid: "Pago integral — R$ 250", partial: "50% pago — R$ 125", pending: "Não pago" };
    const rows = teams.map(team => `<tr><td><a class="team-link" href="/admin/times/${team.id}"><b>${escapeHtml(team.name)}</b><small>${escapeHtml(team.email)}</small><span>Ver jogadores e ficha →</span></a></td><td>${escapeHtml(team.responsible)}<small>${escapeHtml(team.phone)}</small></td><td>${team.players.length}</td><td>${paymentLabel[team.paymentStatus] || "Não pago"}</td><td><span class="status ${team.status}">${team.status === "approved" ? "Confirmado" : "Pendente"}</span></td><td class="table-actions"><a class="action-btn action-view" href="/admin/times/${team.id}">Abrir ficha</a>${team.status === "pending" ? `<form method="post" action="/admin/times/${team.id}/aprovar"><button class="action-btn action-approve">Autorizar</button></form>` : `<form method="post" action="/admin/times/${team.id}/reabrir"><button class="action-btn action-reopen">Reabrir</button></form>`}</td></tr>`).join("");
    const chart = `<div class="chart-row"><span>Confirmados</span><div><i style="width:${all.length ? Math.round(approved / all.length * 100) : 0}%"></i></div><b>${approved}</b></div><div class="chart-row"><span>Pendentes</span><div><i class="pending-bar" style="width:${all.length ? Math.round(pending / all.length * 100) : 0}%"></i></div><b>${pending}</b></div><div class="chart-row"><span>Pagos integralmente</span><div><i class="paid-bar" style="width:${all.length ? Math.round(paid / all.length * 100) : 0}%"></i></div><b>${paid}</b></div>`;
    send(response, 200, render("dashboard", { userName: escapeHtml(user.name), totalTeams: all.length, approvedTeams: approved, pendingTeams: pending, expectedRevenue: expectedRevenue.toLocaleString("pt-BR"), collectedRevenue: collectedRevenue.toLocaleString("pt-BR"), authorizedLimit, query, teams: rows, chart }));
  },
  team(request, response, team) {
    if (!team) return send(response, 404, "Time não encontrado.");
    const position = Number(team.position) || 0;
    const positionOptions = ["Não definida", "1º lugar", "2º lugar", "3º lugar", "4º lugar"].map((label, index) => `<option value="${index || ""}" ${position === index ? "selected" : ""}>${label}</option>`).join("");
    const paymentStatus = ["pending", "partial", "paid"].includes(team.paymentStatus) ? team.paymentStatus : "pending";
    send(response, 200, render("team-detail", { teamName: escapeHtml(team.name), teamId: team.id, responsible: escapeHtml(team.responsible), email: escapeHtml(team.email), phone: escapeHtml(team.phone), status: team.status === "approved" ? "Confirmado" : "Pendente", players: team.players.map((player, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(player.name)}</td><td>${escapeHtml(player.phone)}</td><td><input type="checkbox" name="goalkeeper[${player.id}]" value="1" ${player.isGoalkeeper ? "checked" : ""}></td></tr>`).join("") || '<tr><td colspan="4">Nenhum jogador cadastrado.</td></tr>', championChecked: team.champion ? "checked" : "", positionOptions, paymentOptions: ["pending", "partial", "paid"].map(value => `<option value="${value}" ${paymentStatus === value ? "selected" : ""}>${{ pending: "Não pago", partial: "50% pago (R$ 125)", paid: "100% pago (R$ 250)" }[value]}</option>`).join("") }));
  },
  async updateResult(request, response, id) { const body = await parseBody(request); await TeamModel.updateResult(id, body); redirect(response, `/admin/times/${id}`); },
  async updatePayment(request, response, id) { const body = await parseBody(request); await TeamModel.updatePaymentStatus(id, body.paymentStatus); redirect(response, `/admin/times/${id}`); },
  async updateGoalkeepers(request, response, id) {
    const body = await parseBody(request);
    const ids = Object.keys(body)
      .map(key => key.match(/^goalkeeper\[(.+)\]$/))
      .filter(match => match && body[match[0]] === "1")
      .map(match => match[1]);
    await TeamModel.setGoalkeepers(id, ids);
    redirect(response, `/admin/times/${id}`);
  },
  async updateAuthorizedLimit(request, response) { const body = await parseBody(request); await SettingsModel.updateAuthorizedTeamLimit(body.authorizedTeamLimit); redirect(response, "/admin"); },
  async exportTeams(_, response) {
    const rows = ["Time;Responsável;E-mail;WhatsApp;Status;Pagamento;Campeão;Posição;Jogador;Telefone"];
    (await TeamModel.list()).forEach(team => {
      const players = team.players.length ? team.players : [{ name: "", phone: "" }];
      players.forEach(player => rows.push([team.name, team.responsible, team.email, team.phone, team.status === "approved" ? "Confirmado" : "Pendente", team.paymentStatus === "paid" ? "100% pago" : team.paymentStatus === "partial" ? "50% pago" : "Não pago", team.champion ? "Sim" : "Não", team.position || "", player.name, player.phone].map(csv).join(";")));
    });
    response.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="copa-laranjeiras-times.csv"', "Cache-Control": "no-store" });
    response.end(`﻿${rows.join("\r\n")}`);
  },
  async bracket(_, response) {
    const allMatches = await MatchModel.list();
    const matches = allMatches.map(match => `<article class="match"><small>${match.round} · Jogo ${match.position}</small><b>${escapeHtml(match.home.name)}</b><span>×</span><b>${match.away ? escapeHtml(match.away.name) : "A definir"}</b></article>`).join("");
    const matchesTable = allMatches.map(match => `<tr><td>${escapeHtml(match.round)}</td><td>${escapeHtml(match.home.name)}<span> × </span>${match.away ? escapeHtml(match.away.name) : "A definir"}</td><td>${match.homeScore ?? "—"} × ${match.awayScore ?? "—"}</td><td><span class="status ${match.status === "finished" ? "approved" : "pending"}">${match.status === "finished" ? "Encerrada" : "Agendada"}</span></td><td><a class="action-btn action-view" href="/admin/partidas/${match.id}">Lançar estatísticas</a></td></tr>`).join("") || '<tr><td colspan="5">Nenhuma partida cadastrada ainda.</td></tr>';
    send(response, 200, render("bracket", {
      matches: matches || '<p class="muted">Nenhum chaveamento gerado ainda.</p>',
      newMatchForm: await MatchController.newMatchForm(),
      matchesTable
    }));
  },
  async generate(_, response) { await generateBracket(); redirect(response, "/admin/chaveamento"); }
};
module.exports = AdminController;
