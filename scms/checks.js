//functions for checking session
const db = require("./db");

async function checkLogin(session) {
	return session.username && session.userId;
}
async function checkManager(session) {
	let manager = await db.query(
		`SELECT priv FROM |||users
		WHERE id = $1
		AND (
			priv >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1
		);`,
		[session.userId]
	);
	if (manager.error) return false;
	return !!manager.rowCount;
}
async function checkPriv(session, setting) {
	let priv = await db.query(
		`SELECT 1 FROM |||settings
		WHERE (name = $1 AND value = '0')
		OR (SELECT priv FROM |||users WHERE id = $2) >= (SELECT value::INT FROM |||settings WHERE name = $1)
		OR (SELECT priv FROM |||users WHERE id = $2) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
		OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $2;`,
		[setting, session.userId]
	);
	if (priv.error) return false;
	return !!priv.rowCount;
}
async function checkCreator(session, contentId) {
	let creator = await db.query(
		`SELECT 1 FROM |||contents
		WHERE id = $1
		AND (
			(SELECT priv FROM |||users WHERE id = $2) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $2
			OR creator = $2
		);`,
		[contentId, session.userId]
	);
	if (creator.error) return false;
	return !!creator.rowCount;
}

module.exports = {
	checkLogin,
	checkManager,
	checkPriv,
	checkCreator,
};
