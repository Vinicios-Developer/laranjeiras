const { query } = require("./database");

const SettingsModel = {
  async get() {
    const { rows } = await query("select authorized_team_limit from settings where id = true", []);
    return { authorizedTeamLimit: rows[0] ? rows[0].authorized_team_limit : 24 };
  },
  async updateAuthorizedTeamLimit(value) {
    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > 999) return null;
    const { rows } = await query(
      "update settings set authorized_team_limit = $1 where id = true returning authorized_team_limit",
      [limit]
    );
    return { authorizedTeamLimit: rows[0].authorized_team_limit };
  }
};
module.exports = SettingsModel;
