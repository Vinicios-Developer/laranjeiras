const { send } = require("../utils/http");
const { render } = require("../views/layout");
const { isStatsAvailable } = require("./stats.controller");
const TeamModel = require("../models/team.model");
const SettingsModel = require("../models/settings.model");
const config = require("../config");
const playerFields = Array.from({ length: 10 }, (_, index) => `<div class="player-card"><span>${String(index + 1).padStart(2, "0")}</span><div><input name="playerName${index + 1}" placeholder="Nome do jogador" maxlength="100"><input name="playerPhone${index + 1}" placeholder="Telefone" inputmode="tel" maxlength="20"></div></div>`).join("");
const HomeController = {
  async index(request, response) {
    const statsNavLink = isStatsAvailable() ? `<a href="/estatisticas">Estatísticas</a>` : "";
    const [teams, settings] = await Promise.all([TeamModel.list(), SettingsModel.get()]);
    const approvedCount = teams.filter(team => team.status === "approved").length;
    const spotsLeft = Math.max(0, settings.authorizedTeamLimit - approvedCount);
    const protocol = request.headers["x-forwarded-proto"] || "http";
    send(response, 200, render("home", {
      statsNavLink,
      teamsRegistered: teams.length,
      spotsLeft,
      eventDateTime: `${config.tournament.date}T08:00:00-04:00`,
      baseUrl: `${protocol}://${request.headers.host}`
    }));
  },
  login(_, response, error = "") { send(response, 200, render("login", { error })); },
  teamAccess(_, response, error = "") { send(response, 200, render("team-access", { error })); },
  register(_, response) { send(response, 200, render("register", { playerFields })); }
};
module.exports = HomeController;
