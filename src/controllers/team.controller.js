const TeamModel = require("../models/team.model");
const SettingsModel = require("../models/settings.model");
const config = require("../config");
const crypto = require("crypto");
const { parseBody, redirect, sendJson } = require("../utils/http");
const { render } = require("../views/layout");
const { send } = require("../utils/http");
function playersFromBody(body) {
  return Array.from({ length: 10 }, (_, index) => ({
    name: String(body[`playerName${index + 1}`] || "").trim(),
    phone: String(body[`playerPhone${index + 1}`] || "").trim()
  })).filter(player => player.name || player.phone);
}
function playerEntriesFromBody(body) {
  return Array.from({ length: 10 }, (_, index) => ({
    id: body[`playerId${index + 1}`] || null,
    name: String(body[`playerName${index + 1}`] || "").trim(),
    phone: String(body[`playerPhone${index + 1}`] || "").trim(),
    left: body[`playerLeft${index + 1}`] === "1",
    isGoalkeeper: body[`playerGoalkeeper${index + 1}`] === "1"
  }));
}
function playerFields(players = []) {
  return Array.from({ length: 10 }, (_, index) => {
    const player = players[index] || {};
    const hasPlayer = Boolean(player.id);
    return `<div class="player-card"><span>${String(index + 1).padStart(2, "0")}</span><div>${hasPlayer ? `<input type="hidden" name="playerId${index + 1}" value="${player.id}">` : ""}<input name="playerName${index + 1}" placeholder="Nome do jogador" maxlength="100" value="${escapeHtml(player.name || "")}"><input name="playerPhone${index + 1}" placeholder="Telefone" inputmode="tel" maxlength="20" value="${escapeHtml(player.phone || "")}">${hasPlayer ? `<label class="player-goalkeeper-toggle"><input type="checkbox" name="playerGoalkeeper${index + 1}" value="1" ${player.isGoalkeeper ? "checked" : ""}> 🧤 É o goleiro</label><label class="player-left-toggle"><input type="checkbox" name="playerLeft${index + 1}" value="1"> Jogador saiu do time (coloque o nome de quem entrou no lugar)</label>` : ""}</div></div>`;
  }).join("");
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }
function paymentOptionsHtml() {
  const { dueDateInstallment1, dueDateInstallment2, dueDateFull, cardLink, pixFullLink, pixInstallmentLink } = config.payments;
  const options = [
    { icon: "💳", title: "Cartão de crédito", price: "R$ 250 à vista", due: `Vencimento até ${dueDateFull}`, label: "Pagar com cartão", link: cardLink },
    { icon: "🔑", title: "Pix à vista", price: "R$ 250", due: `Vencimento até ${dueDateFull}`, label: "Pagar no Pix", link: pixFullLink },
    { icon: "📅", title: "Pix parcelado", price: "2x de R$ 125", due: `1ª parcela até ${dueDateInstallment1} · 2ª até ${dueDateInstallment2}`, label: "Pagar parcelado no Pix", link: pixInstallmentLink }
  ];
  return options.map(option => `<article class="payment-method"><span class="payment-method-icon">${option.icon}</span><h3>${option.title}</h3><strong>${option.price}</strong><small>${option.due}</small><a class="button button-primary full" href="${option.link}" target="_blank" rel="noopener">${option.label} ↗</a></article>`).join("");
}
function methodLabel(team) { return team.payment === "avista" ? "à vista" : "parcelado (2x)"; }
function whatsappLink(team) {
  const message = `Olá! Sou responsável pelo time ${team.name} na Copa Laranjeiras e estou enviando o comprovante do pagamento da inscrição.`;
  return `https://wa.me/${config.payments.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
function remainingInstallmentHtml() {
  const { dueDateInstallment2, pixInstallmentLink } = config.payments;
  return `<article class="payment-method"><span class="payment-method-icon">📅</span><h3>2ª parcela</h3><strong>R$ 125</strong><small>Vencimento até ${dueDateInstallment2}</small><a class="button button-primary full" href="${pixInstallmentLink}" target="_blank" rel="noopener">Pagar 2ª parcela no Pix ↗</a></article>`;
}
function paymentBodyHtml(team) {
  if (team.paymentStatus === "paid") {
    return `<div class="payment-paid"><span class="payment-paid-icon">✅</span><div><strong>Pagamento confirmado</strong><p>Recebemos a confirmação do pagamento ${methodLabel(team)}. Sua vaga está garantida!</p></div></div>`;
  }
  if (team.paymentStatus === "partial") {
    return `<div class="payment-methods">${remainingInstallmentHtml()}</div><a class="button full whatsapp-btn" href="${whatsappLink(team)}" target="_blank" rel="noopener">📲 Enviar comprovante no WhatsApp</a><small class="payment-note">Já recebemos a 1ª parcela. Depois de pagar a 2ª, envie o comprovante pelo WhatsApp acima.</small>`;
  }
  return `<div class="payment-methods">${paymentOptionsHtml()}</div><a class="button full whatsapp-btn" href="${whatsappLink(team)}" target="_blank" rel="noopener">📲 Enviar comprovante no WhatsApp</a><small class="payment-note">Depois de pagar, envie o comprovante pelo WhatsApp acima para a organização confirmar seu pagamento.</small>`;
}
function bracketForTeam(team, matches) {
  if (!matches.length) return `<div class="bracket-empty"><span class="bracket-icon">✦</span><strong>Seu chaveamento ainda não foi divulgado</strong><p>Assim que a organização gerar os confrontos, sua chave aparecerá aqui até a grande final.</p></div>`;
  const teamMatch = matches.find(match => match.home?.id === team.id || match.away?.id === team.id);
  const rounds = ["Oitavas de final", "Quartas de final", "Semifinal", "Final"];
  return `<div class="bracket-status"><span class="live-dot"></span> Chaveamento publicado <small>Atualizado pela organização</small></div><div class="team-bracket">${rounds.map((round, index) => {
    const activeMatch = index === 0 && teamMatch;
    const isFinal = index === rounds.length - 1;
    return `<div class="bracket-round ${activeMatch ? "current" : ""}"><p>${round}</p><article class="bracket-match">${activeMatch ? `<small>Jogo ${teamMatch.position}</small><b>${escapeHtml(teamMatch.home.name)}</b><span>×</span><b>${teamMatch.away ? escapeHtml(teamMatch.away.name) : "A definir"}</b>` : `<small>${isFinal ? "Decisão do campeonato" : "Aguardando resultados"}</small><b>${isFinal ? "Grande final" : "Vencedor da fase anterior"}</b><span>→</span><b>${isFinal ? "Campeão" : "Próxima fase"}</b>`}</article></div>`;
  }).join("")}</div>`;
}
const TeamController = {
  async create(request, response) {
    const body = await parseBody(request);
    const players = playersFromBody(body);
    if (!body.name || !body.responsible) return sendJson(response, 400, { error: "Informe o nome do time e o responsável." });
    const accessToken = crypto.randomBytes(24).toString("hex");
    const team = await TeamModel.create({ name: body.name.trim(), responsible: body.responsible.trim(), phone: body.phone, email: body.email, payment: body.payment, paymentStatus: "pending", players, accessToken });
    redirect(response, `/time/${team.id}?token=${accessToken}&novo=1`);
  },
  async access(request, response) {
    const body = await parseBody(request);
    const team = await TeamModel.findByAccess(body.email, body.phone);
    if (!team) return send(response, 200, render("team-access", {
      error: "Não encontramos um time com esses dados. Confira o e-mail e o WhatsApp informados na inscrição."
    }));
    redirect(response, `/time/${team.id}?token=${team.accessToken}&acesso=1`);
  },
  async manage(request, response, team, token, isNew = false) {
    if (!team || team.accessToken !== token) return sendJson(response, 403, { error: "Link de gerenciamento inválido ou expirado." });
    const MatchModel = require("../models/match.model");
    const firstInstallment = team.payment === "avista" ? "R$ 250" : "R$ 125";
    const paymentLabel = team.payment === "avista" ? "Pagamento à vista" : "Pagamento parcelado em 2x";
    const paymentStatus = team.paymentStatus === "paid" ? `Pago — ${methodLabel(team)}` : team.paymentStatus === "partial" ? "50% pago" : "Pendente";
    const paymentSummaryNote = team.paymentStatus === "paid"
      ? "Pagamento confirmado pela organização."
      : team.paymentStatus === "partial"
        ? `Recebemos a 1ª parcela (R$ 125). Falta a 2ª parcela (R$ 125) até ${config.payments.dueDateInstallment2}.`
        : `Escolhido na inscrição: <b>${firstInstallment}</b> · parcelado 1ª até ${config.payments.dueDateInstallment1} e 2ª até ${config.payments.dueDateInstallment2} · à vista até ${config.payments.dueDateFull}`;
    const statusLabel = team.status === "approved" ? "Inscrição confirmada" : "Inscrição em análise";
    const statusClass = team.status === "approved" ? "approved" : "pending";
    const matches = await MatchModel.list();
    send(response, 200, render("team-panel", { teamName: escapeHtml(team.name), responsible: escapeHtml(team.responsible), playerFields: playerFields(team.players), token, teamId: team.id, success: isNew ? "Inscrição recebida! Salve este link para atualizar os jogadores depois." : "", paymentLabel, paymentStatus, paymentSummaryNote, paymentBody: paymentBodyHtml(team), statusLabel, statusClass, bracket: bracketForTeam(team, matches) }));
  },
  async updatePlayers(request, response, team, token) {
    if (!team || team.accessToken !== token) return sendJson(response, 403, { error: "Link de gerenciamento inválido ou expirado." });
    const entries = playerEntriesFromBody(await parseBody(request));
    await TeamModel.updatePlayers(team.id, entries);
    redirect(response, `/time/${team.id}?token=${token}&salvo=1`);
  },
  async payment(request, response, team, token) {
    if (!team || team.accessToken !== token) return sendJson(response, 403, { error: "Link de gerenciamento inválido ou expirado." });
    await TeamModel.updatePayment(team.id, "awaiting_checkout");
    redirect(response, `/time/${team.id}?token=${token}&pagamento=1`);
  },
  async approve(request, response, id) {
    const team = await TeamModel.findById(id);
    const limit = (await SettingsModel.get()).authorizedTeamLimit;
    const approvedCount = (await TeamModel.list()).filter(item => item.status === "approved").length;
    if (!team) return sendJson(response, 404, { error: "Time não encontrado." });
    if (team.status !== "approved" && approvedCount >= limit) return sendJson(response, 409, { error: `O limite atual de ${limit} times autorizados foi atingido. Aumente o limite no painel para autorizar este time.` });
    await TeamModel.updateStatus(id, "approved");
    redirect(response, "/admin");
  },
  async reopen(request, response, id) { await TeamModel.updateStatus(id, "pending"); redirect(response, "/admin"); }
};
module.exports = TeamController;
