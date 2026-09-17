const STORAGE_KEY = "copa-laranjeiras-teams";
const modal = document.querySelector("#register-modal");
const form = document.querySelector("#register-form");
const toast = document.querySelector("#toast");
const playersList = document.querySelector("#players-list");
let currentStep = 1;

const getTeams = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveTeams = teams => localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
const showToast = message => { toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 3500); };

function renderPlayers() {
  playersList.innerHTML = "";
  const players = form.dataset.players ? JSON.parse(form.dataset.players) : [{ name: "", phone: "" }, { name: "", phone: "" }, { name: "", phone: "" }, { name: "", phone: "" }, { name: "", phone: "" }];
  players.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `<input required placeholder="Nome do jogador ${index + 1}" value="${player.name || ""}" data-player-name><input required placeholder="CPF ou telefone" value="${player.phone || ""}" data-player-phone><button type="button" class="remove-player" aria-label="Remover jogador">×</button>`;
    row.querySelector(".remove-player").addEventListener("click", () => { if (playersList.children.length > 5) row.remove(); else showToast("O time precisa ter pelo menos 5 jogadores."); });
    playersList.appendChild(row);
  });
}
function changeStep(next) {
  const activeFormStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
  if (next > currentStep && !activeFormStep.reportValidity()) return;
  if (next === 3 && playersList.querySelectorAll(".player-row").length < 5) { showToast("Adicione pelo menos 5 jogadores."); return; }
  if (next === 3) {
    const players = [...playersList.querySelectorAll(".player-row")].map(row => ({ name: row.querySelector("[data-player-name]").value, phone: row.querySelector("[data-player-phone]").value }));
    if (!players.every(player => player.name && player.phone)) { showToast("Preencha os dados de todos os jogadores."); return; }
    form.dataset.players = JSON.stringify(players);
  }
  currentStep = next;
  document.querySelectorAll(".form-step").forEach(step => step.classList.toggle("active", Number(step.dataset.step) === currentStep));
  document.querySelectorAll(".steps span").forEach((step, index) => step.classList.toggle("active", index < currentStep));
}
function openRegister() { modal.classList.remove("hidden"); currentStep = 1; form.reset(); delete form.dataset.players; renderPlayers(); changeStep(1); }
function closeRegister() { modal.classList.add("hidden"); }

document.querySelectorAll("[data-open-register]").forEach(button => button.addEventListener("click", openRegister));
document.querySelector("[data-close-register]").addEventListener("click", closeRegister);
modal.addEventListener("click", event => { if (event.target === modal) closeRegister(); });
document.querySelectorAll("[data-next]").forEach(button => button.addEventListener("click", () => changeStep(currentStep + 1)));
document.querySelectorAll("[data-prev]").forEach(button => button.addEventListener("click", () => changeStep(currentStep - 1)));
document.querySelector("#add-player").addEventListener("click", () => {
  if (playersList.children.length >= 12) return showToast("O limite é de 12 jogadores.");
  const players = [...playersList.querySelectorAll(".player-row")].map(row => ({ name: row.querySelector("[data-player-name]").value, phone: row.querySelector("[data-player-phone]").value }));
  players.push({ name: "", phone: "" }); form.dataset.players = JSON.stringify(players); renderPlayers();
});
form.addEventListener("submit", event => {
  event.preventDefault();
  if (!document.querySelector('.form-step[data-step="3"]').reportValidity()) return;
  const data = new FormData(form);
  const team = { id: Date.now(), name: data.get("teamName"), responsible: data.get("responsible"), phone: data.get("phone"), email: data.get("email"), payment: data.get("payment"), players: JSON.parse(form.dataset.players || "[]"), status: "pending", createdAt: new Date().toISOString() };
  saveTeams([...getTeams(), team]); closeRegister(); showToast("Inscrição recebida! A organização entrará em contato pelo WhatsApp.");
  if (document.body.classList.contains("admin-mode")) renderAdmin();
});

function renderAdmin() {
  const query = document.querySelector("#team-search").value.toLowerCase();
  const filter = document.querySelector("#status-filter").value;
  const all = getTeams();
  const teams = all.filter(team => (filter === "all" || team.status === filter) && team.name.toLowerCase().includes(query));
  document.querySelector("#stat-teams").innerHTML = `${all.length} <small>/ 24</small>`;
  document.querySelector("#stat-approved").textContent = all.filter(team => team.status === "approved").length;
  document.querySelector("#stat-pending").textContent = all.filter(team => team.status === "pending").length;
  document.querySelector("#stat-revenue").textContent = `R$ ${(all.length * 250).toLocaleString("pt-BR")}`;
  document.querySelector("#teams-progress").style.width = `${Math.min(all.length / 24 * 100, 100)}%`;
  document.querySelector("#team-count").textContent = `${teams.length} equipe${teams.length === 1 ? "" : "s"} encontrada${teams.length === 1 ? "" : "s"}`;
  const table = document.querySelector("#teams-table");
  table.innerHTML = teams.map(team => `<tr><td><span class="team-name">${team.name}</span><span class="team-email">${team.email}</span></td><td>${team.responsible}<span class="team-email">${team.phone}</span></td><td>${team.players.length} atletas</td><td>${team.payment === "avista" ? "À vista — R$ 250" : "2x de R$ 125"}<span class="team-email">${team.status === "approved" ? "Pagamento confirmado" : "Aguardando 1ª parcela"}</span></td><td><span class="status ${team.status}">${team.status === "approved" ? "Confirmado" : "Pendente"}</span></td><td>${team.status === "pending" ? `<button class="action-btn" data-approve="${team.id}">Autorizar</button>` : `<button class="action-btn" data-pending="${team.id}">Reabrir</button>`}</td></tr>`).join("");
  document.querySelector("#empty-state").classList.toggle("hidden", teams.length > 0);
  document.querySelectorAll("[data-approve], [data-pending]").forEach(button => button.addEventListener("click", () => { const teams = getTeams(); const team = teams.find(item => item.id === Number(button.dataset.approve || button.dataset.pending)); team.status = button.dataset.approve ? "approved" : "pending"; saveTeams(teams); renderAdmin(); showToast(team.status === "approved" ? "Time autorizado para participar." : "Time voltou para pendente."); }));
}

if (new URLSearchParams(location.search).has("admin")) {
  document.body.classList.add("admin-mode");
  document.querySelector("main#inicio").classList.add("hidden");
  document.querySelector("body > footer").classList.add("hidden");
  document.querySelector("#admin-view").classList.remove("hidden");
  document.querySelector("#team-search").addEventListener("input", renderAdmin);
  document.querySelector("#status-filter").addEventListener("change", renderAdmin);
  renderAdmin();
}
