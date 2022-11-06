const express = require("express");
const router = express.Router();
const db = require("./db");

const trace = require("./trace");
const checkLogin = require("./checks").checkLogin;
const checkManager = require("./checks").checkManager;

//get settings
router.get("/current/", async (req, res) => {
	let result = await getSettings(req.query, req.session);
	res.json(result);
});
async function getSettings(data, session) {
	//check if manager
	if (!await checkLogin(session)) return {message: "Not logged in!"};
	if (!await checkManager(session)) return {message: "Only manager can get settings!"};
	
	//get settings
	let settings = await db.query("SELECT name, value FROM |||settings;");
	if (settings.error) return {settings: "Error!"};
	return {message: "Setting fetched!", fetched: true, settings: settings.rows};
}

//change setting
router.put("/change/", async (req, res) => {
	let result = await changeSetting(req.body, req.session);
	res.json(result);
});
async function changeSetting(data, session) {
	//check if manager
	if (!await checkLogin(session)) return {message: "Not logged in!"};
	if (!await checkManager(session)) return {message: "Only manager can chage settings!"};
	
	//change setting
	let name = data.name;
	let value = data.value.toString();
	if (!name || !name.length) return {message: "No setting!"};
	if (!value || !value.length) return {message: "No value!"};
	
	let changed = await db.query(
		"UPDATE |||settings SET value = $1 WHERE name = $2;",
		[value, name]
	);
	if (changed.error) return {message: "Error!"};
	trace(`${session.username} changed setting!`);
	return {message: "Setting changed!", changed: true};
}

module.exports = router;