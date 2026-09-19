const form = document.querySelector("#team-form");
const feedback = document.querySelector("#feedback");
const submitButton = form.querySelector("button[type=submit], button:not([type])");
let submitting = false;
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (submitting) return;
  submitting = true;
  if (submitButton) submitButton.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/inscricao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (response.redirected) { window.location.href = response.url; return; }
    const result = await response.json();
    feedback.textContent = result.error;
    feedback.className = "error";
  } finally {
    submitting = false;
    if (submitButton) submitButton.disabled = false;
  }
});
