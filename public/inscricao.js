const form = document.querySelector("#team-form");
const feedback = document.querySelector("#feedback");
form.addEventListener("submit", async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const response = await fetch("/inscricao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (response.redirected) window.location.href = response.url;
  else { const result = await response.json(); feedback.textContent = result.error; feedback.className = "error"; }
});
