function formatBrazilianPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

document.querySelectorAll('input[name="phone"]').forEach(input => {
  input.type = "tel";
  input.inputMode = "numeric";
  input.maxLength = 15;
  input.placeholder = "(92) 99999-9999";
  input.addEventListener("input", () => {
    input.value = formatBrazilianPhone(input.value);
  });
});
