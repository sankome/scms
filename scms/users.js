const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("./db");

const trace = require("./trace");
const checkLogin = require("./checks").checkLogin;
const checkManager = require("./checks").checkManager;

//check main id
router.get("/main/", async (req, res) => {
	let main = await db.query(`SELECT value::INT FROM |||settings WHERE name = 'main' AND value::INT != 0`);
	if (main.rowCount) return res.json({message: "main exists", main: true});
	
	let users = await db.query(`SELECT id FROM |||users;`);
	if (users.rowCount) return res.json({message: "users exist", main: true});
	
	res.json({message: "main does not exist"});
});

//create user
router.post("/create/", async (req, res) => {
	let result = await createUser(req.body, req.session);
	res.json(result);
});
async function createUser(data, session) {
	let userId = session.userId? session.userId: 0;
	
	//check permission
	if (!await checkPriv(session, "create")) return {message: "No permission to create user!"}
	
	let username = data.username;
	let password = data.password;
	
	//check empty username/password and trim/lowercase username
	if (!username || !password) return {message: "Username and/or password cannot be empty!"};
	else if (!(username = username.trim().toLowerCase())) return {message: "Username cannot be spaces!"};
	
	//if first user - make in a main
	let users = await db.query(`SELECT id FROM |||users;`);
	let main = (users.rowCount === 0);
	
	//if not - check for duplicate username
	if (!main) {
		let duplicate = await db.query(`SELECT id FROM |||users WHERE username = $1;`, [username]);
		if (duplicate.rowCount) return {message: "Username already in use!"};
	}
	
	//hash password and add user
	let salt = crypto.randomBytes(16).toString("hex");
	let hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
	let created = await db.query(
		"INSERT INTO |||users (username, hash, salt, priv) VALUES ($1, $2, $3, 0);",
		[username, hash, salt]
	);
	if (created.error) return {message: "Error!"};
	let returning = await db.query(
		"SELECT id, username FROM |||users WHERE username = $1 AND hash = $2 AND salt = $3;",
		[username, hash, salt]
	);
	if (returning.error) return {message: "Error!"};
	trace(`user created! ${returning.rows[0].username}`);
	
	//add login info to session
	if (!session.userId && !session.username) {
		session.userId = returning.rows[0].id;
		session.username = returning.rows[0].username;
		trace(`${session.username} logged in!`);
	}
	
	//change main setting if first user
	if (main) {
		await db.query(`UPDATE |||settings SET value = $1 WHERE name = 'main';`, [session.userId]);
		session.manage = true;
		trace(`${session.username} set as main!`);
	}
	
	return {message: "User created!", created: true};
}

//change password
router.put("/password/", async (req, res) => {
	let result = await changePassword(req.body, req.session);
	res.json(result);
});
async function changePassword(data, session) {
	//check login
	if (!await checkLogin(session)) return {message: "Not logged in!"}
	
	//check empty passwords
	let userId = session.userId;
	let username = session.username;
	let current = data.current;
	let password = data.password;
	if (!current && !password) return {message: "Passwords cannot be empty!"};
	else if (!current) return {message: "Current password cannot be empty!"};
	else if (!password) return {message: "New password cannot be empty!"};
	
	//check old password
	let details = await db.query(
		`SELECT id, username, hash, salt FROM |||users WHERE id = $1 AND username = $2;`,
		[userId, username]
	);
	if (details.error) return {message: "Error!"};
	if (!details.rowCount) return {message: "User not found!"};
	let detail = details.rows[0];
	let hash = crypto.pbkdf2Sync(current, detail.salt, 1000, 64, "sha512").toString("hex");
	if (detail.hash != hash) return {message: "Incorrect password!"}
	
	//change password
	let salt = crypto.randomBytes(16).toString("hex");
	hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
	let changed = await db.query(
		`UPDATE |||users SET hash = $3, salt = $4 WHERE id = $1 AND username = $2;`,
		[userId, username, hash, salt]
	);
	if (changed.error) return {message: "Error!"};
	session.userId = userId;
	session.username = username;
	trace(`${session.username} changed password!`);
	
	return {message: "Password changed!", changed: true};
}

//login user
router.post("/login/", async (req, res) => {
	let result = await loginUser(req.body, req.session);
	res.json(result);
});
async function loginUser(data, session) {
	//check empty username/password and trim/lowercase username
	let username = data.username;
	let password = data.password;
	if (!username || !password) return {message: "Username and/or password cannot be empty!"};
	else if (!(username = username.trim().toLowerCase())) return {message: "Username cannot be spaces!"};
	
	//check if user exists and get details
	let details = await db.query(
		`SELECT id, username, hash, salt FROM |||users WHERE username = $1;`,
		[username]
	);
	if (details.error) return {message: "Error!"};
	if (!details.rowCount) return {message: "User not found!"};
	
	//check password
	let detail = details.rows[0];
	let hash = crypto.pbkdf2Sync(password, detail.salt, 1000, 64, "sha512").toString("hex");
	if (detail.hash == hash) {		
		session.userId = detail.id;
		session.username = detail.username;
		let manage = await db.query(
			`SELECT 1 FROM |||users
			WHERE (
				priv >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				AND id = $1
			)
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1;`,
			[session.userId]
		);
		if (manage.rowCount) session.manage = true;
		trace(`${session.username} logged in!`);
		return {message: "Login successful!", login: true};
	} else return {message: "Incorrect password!"}
}

//logout user
router.delete("/logout/", (req, res) => {
	if (req.session.username) trace(`${req.session.username} logged out!`);
	req.session.destroy();
	res.json({message: "Logout successful!", logout: true});
});

//login status
router.get("/status/", async (req, res) => {
	if (!await checkLogin(req.session)) res.json({message: "Not logged in!"});
	else res.json({message: "Logged in as " + req.session.username + "!", login: true});
});

//change priv
router.put("/priv/", async (req, res) => {
	let result = await changePriv(req.body, req.session);
	res.json(result);
});
async function changePriv(data, session) {
	//check if manager
	if (!await checkManager(session)) return {message: "Only manager can change priv!"};
	
	let userId = data.id;
	if (!userId) return {message: "No user!"};
	let priv = data.priv;
	if (!priv) return {message: "No priv!"};
	
	//change priv value
	let changed = await db.query(`UPDATE |||users SET priv = $2 WHERE id = $1;`, [userId, priv]);
	if (changed.error) return {message: "Error!"};
	trace(`${session.username} changed priv of ${userId}!`);
	return {message: "Priv changed!", changed: true};
}

//list users
router.get("/list/", async (req, res) => {
	let result = await listUsers(req.query, req.session);
	res.json(result);
});
async function listUsers(data, session) {
	//check if manager
	if (!await checkLogin(session)) return {message: "Not logged in!"};
	if (!await checkManager(session)) return {message: "Only manager can change priv!"};
	
	let limit = parseInt(data.limit? data.limit: 100, 10);
	let offset = parseInt(data.offet? data.offet: 0, 10);
	
	//list users
	let users = await db.query(
		`SELECT id, username, priv,
			((SELECT value::INT FROM |||settings WHERE name = 'main') = id) AS main,
			(priv >= (SELECT value::INT FROM |||settings WHERE name = 'manage')) AS manage
		FROM |||users
		ORDER BY id;`
	);
	if (users.error) return {message: "Error!"};
	if (!users.rowCount) return {message: "No user found!"};
	
	let showing = [];
	for (let i = offset; i < offset + limit; i++) {
		if (users.rows.length <= i || !users.rows[i]) break;
		showing.push(users.rows[i]);
	}
	return {message: "Users listed!", listed: true, users: showing, count: users.rows.length};
}

module.exports = router;