const { pool } = require("../db/pool");

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { query };
