const fs = require("fs");
const path = require("path");
function render(view, data = {}) {
  const template = fs.readFileSync(path.resolve(__dirname, `${view}.html`), "utf8");
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (data[key] === undefined || data[key] === null ? "" : data[key]));
}
module.exports = { render };
