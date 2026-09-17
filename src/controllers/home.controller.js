const { send } = require("../utils/http");
const { render } = require("../views/layout");
const playerFields = Array.from({ length: 10 }, (_, index) => `<div class="player-card"><span>${String(index + 1).padStart(2, "0")}</span><div><input name="playerName${index + 1}" placeholder="Nome do jogador" maxlength="100"><input name="playerPhone${index + 1}" placeholder="Telefone" inputmode="tel" maxlength="20"></div></div>`).join("");
const HomeController = {
  index(_, response) { send(response, 200, render("home")); },
  login(_, response, error = "") { send(response, 200, render("login", { error })); },
  teamAccess(_, response, error = "") { send(response, 200, render("team-access", { error })); },
  register(_, response) { send(response, 200, render("register", { playerFields })); }
};
module.exports = HomeController;
