const HomeController = require("./controllers/home.controller");
const path = require("path");
const AuthController = require("./controllers/auth.controller");
const TeamController = require("./controllers/team.controller");
const AdminController = require("./controllers/admin.controller");
const MatchController = require("./controllers/match.controller");
const StatsController = require("./controllers/stats.controller");
const TeamModel = require("./models/team.model");
const { currentUser, requireRole } = require("./middleware/auth.middleware");
const { staticFile, redirect, sendError } = require("./utils/http");
const { render } = require("./views/layout");
const router = {
  async handle(request, response) {
    const url = new URL(request.url, "http://localhost"); const route = url.pathname;
    if (route === "/styles.css" || route === "/styles-v2.css") return staticFile(response, "styles.css");
    if (route === "/team.css") return staticFile(response, "team.css");
    if (route === "/admin.css") return staticFile(response, "admin.css");
    if (route === "/inscricao.js") return staticFile(response, "public/inscricao.js");
    if (route === "/phone-mask.js") return staticFile(response, "public/phone-mask.js");
    if (route.startsWith("/assets/")) return staticFile(response, `public${route}`);
    if (request.method === "GET" && route === "/") return HomeController.index(request, response);
    if (request.method === "GET" && route === "/login") return HomeController.login(request, response, url.searchParams.get("error") || "");
    if (request.method === "GET" && route === "/cadastro") return response.end(render("register-user"));
    if (request.method === "GET" && route === "/inscricao") return HomeController.register(request, response);
    if (request.method === "GET" && route === "/acesso-time") return HomeController.teamAccess(request, response, url.searchParams.get("error") || "");
    if (request.method === "GET" && route === "/estatisticas") return StatsController.index(request, response);
    if (request.method === "POST" && route === "/login") return AuthController.login(request, response);
    if (request.method === "POST" && route === "/cadastro") return AuthController.register(request, response);
    if (request.method === "GET" && route === "/logout") return AuthController.logout(request, response);
    if (request.method === "POST" && route === "/inscricao") return TeamController.create(request, response);
    if (request.method === "POST" && route === "/acesso-time") return TeamController.access(request, response);
    const teamRoute = route.match(/^\/time\/([^/]+)$/);
    const playersRoute = route.match(/^\/time\/([^/]+)\/jogadores$/);
    const paymentRoute = route.match(/^\/time\/([^/]+)\/pagamento$/);
    if (teamRoute && request.method === "GET") {
      const token = url.searchParams.get("token");
      const team = await TeamModel.findById(teamRoute[1]);
      return TeamController.manage(request, response, team, token, url.searchParams.has("novo") || url.searchParams.has("salvo"));
    }
    if (playersRoute && request.method === "POST") {
      const token = url.searchParams.get("token");
      const team = await TeamModel.findById(playersRoute[1]);
      return TeamController.updatePlayers(request, response, team, token);
    }
    if (paymentRoute && request.method === "POST") {
      const token = url.searchParams.get("token");
      const team = await TeamModel.findById(paymentRoute[1]);
      return TeamController.payment(request, response, team, token);
    }
    if (request.method === "GET" && route === "/admin") { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return AdminController.dashboard(request, response, user); return; }
    if (request.method === "POST" && route === "/admin/configuracoes/limite-times") { const user = await requireRole(request, response, ["admin"]); if (user) return AdminController.updateAuthorizedLimit(request, response); return; }
    const adminTeam = route.match(/^\/admin\/times\/([^/]+)$/);
    if (request.method === "GET" && adminTeam) { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return AdminController.team(request, response, await TeamModel.findById(adminTeam[1])); return; }
    const adminPayment = route.match(/^\/admin\/times\/([^/]+)\/pagamento$/);
    if (request.method === "POST" && adminPayment) { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return AdminController.updatePayment(request, response, adminPayment[1]); return; }
    const adminGoalkeeper = route.match(/^\/admin\/times\/([^/]+)\/goleiro$/);
    if (request.method === "POST" && adminGoalkeeper) { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return AdminController.updateGoalkeepers(request, response, adminGoalkeeper[1]); return; }
    if (request.method === "POST" && adminTeam) { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return AdminController.updateResult(request, response, adminTeam[1]); return; }
    if (request.method === "GET" && route === "/admin/exportar-times") { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return AdminController.exportTeams(request, response); return; }
    if (request.method === "GET" && route === "/admin/chaveamento") { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return AdminController.bracket(request, response); return; }
    if (request.method === "POST" && route === "/admin/chaveamento") { const user = await requireRole(request, response, ["admin"]); if (user) return AdminController.generate(request, response); return; }
    if (request.method === "POST" && route === "/admin/partidas") { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return MatchController.create(request, response); return; }
    const matchRoute = route.match(/^\/admin\/partidas\/([^/]+)$/);
    if (request.method === "GET" && matchRoute) { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return MatchController.detail(request, response, matchRoute[1]); return; }
    if (request.method === "POST" && matchRoute) { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return MatchController.save(request, response, matchRoute[1]); return; }
    const action = route.match(/^\/admin\/times\/([^/]+)\/(aprovar|reabrir)$/);
    if (request.method === "POST" && action) { const user = await requireRole(request, response, ["organizer", "admin"]); if (user) return action[2] === "aprovar" ? TeamController.approve(request, response, action[1]) : TeamController.reopen(request, response, action[1]); return; }
    if (request.method === "GET" && staticFile(response, path.join("public", route))) return;
    if (request.method === "GET") return sendError(response, 404, "Página não encontrada.");
    sendError(response, 404, "Rota não encontrada.");
  }
};
module.exports = { router };
