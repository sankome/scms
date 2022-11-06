const express = require("express");
const router = express.Router();
const db = require("./db");

const trace = require("./trace");
const checkLogin = require("./checks").checkLogin;
const checkManager = require("./checks").checkManager;
const checkPriv = require("./checks").checkPriv;
const checkCreator = require("./checks").checkCreator;

//add comment
router.post("/add/", async (req, res) => {
	let result = await addComment(req.body, req.session);
	res.json(result);
});
async function addComment(data, session) {
	let contentId = data.content;
	if (!contentId) return {message: "No content id!"};
	
	//check if content exists
	let result = await db.query(
		`SELECT 1 FROM |||contents AS c
		INNER JOIN |||users AS u ON u.id = c.creator
		WHERE c.id = $1
		AND (
			c.draft = 0
			OR (
				(SELECT priv FROM |||users WHERE id = $2) >= c.visible
				OR (SELECT priv FROM |||users WHERE id = $2) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $2
				OR c.creator = $2
			)
		)
		AND (
			(SELECT priv FROM |||users WHERE id = $2) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $2
			OR c.removed = 0
		);`,
		[contentId, session.userId]
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "Content not found!"};
	
	//check priv to view content
	let priv = await db.query(
		`SELECT 1 FROM |||users
		WHERE (
			(priv >= (SELECT visible FROM |||contents WHERE id = $2) AND id = $1)
			OR (SELECT visible FROM |||contents WHERE id = $2) = 0
		);`,
		[session.userId, contentId]
	);
	if (!priv) return {message: "No permission to view content"};
	
	//check priv to add comment
	if (!await checkPriv(session, "comment")) return {message: "No permission to add comment!"};
	
	//add comment
	let name;
	let password;
	if (session.username) {
		name = session.username
		password = "";
	} else {
		name = data.name? data.name: "anonymous";
		password = data.password? data.password: "";
	}
	name = name.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
	let commenterId = session.userId? session.userId: null;
	let date = data.date? data.date: null;
	let comment = data.comment? data.comment: "";
	comment = comment.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
	let visible = data.visible? data.visible: 0;
	
	let added = await db.query(
		`INSERT INTO |||comments (content, commenter, name, date, visible, comment, password) VALUES($1, $2, $3, $4, $5, $6, $7);`,
		[contentId, commenterId, name, date, visible, comment, password],
	);
	if (added.error) return {message: "Error!"};
	let returning = commenterId?
		await db.query(
			`SELECT id FROM |||comments WHERE content = $1 AND commenter = $2 AND name = $3 AND visible = $4 AND comment = $5 AND password = $6;`,
			[contentId, commenterId, name, visible, comment, password],
		):
		await db.query(
			`SELECT id FROM |||comments WHERE content = $1 AND commenter IS NULL AND name = $2 AND visible = $3 AND comment = $4 AND password = $5;`,
			[contentId, name, visible, comment, password],
		);
	if (returning.error) return {message: "Error!"};
	trace(`${name} added comment!`);
	return {message: "Comment added!", added: true, id: returning.rows[0].id};
}

//edit comment
router.put("/edit/", async (req, res) => {
	let result = await editComment(req.body, req.session);
	res.json(result);
});
async function editComment(data, session) {
	let contentId = data.content;
	if (!contentId) return {message: "No content id!"};
	
	let commentId = data.id;
	if (!commentId) return {message: "No comment id!"};
	
	//check commenter name - anonymous if not entered
	let name;
	let password;
	if (session.username) {
		name = session.username
		password = "";
	} else {
		name = data.name? data.name: "anonymous";
		password = data.password? data.password: "";
	}
	name = name.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
	let commenterId = session.userId? session.userId: 0;
	
	//check if content exists
	let result = await db.query(
		`SELECT 1 FROM |||contents AS c
		INNER JOIN |||users AS u ON u.id = c.creator
		WHERE c.id = $1
		AND (
			c.draft = 0
			OR (
				(SELECT priv FROM |||users WHERE id = $2) >= c.visible
				OR (SELECT priv FROM |||users WHERE id = $2) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $2
				OR c.creator = $2
			)
		)
		AND (
			(SELECT priv FROM |||users WHERE id = $2) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $2
			OR c.removed = 0
		);`,
		[contentId, session.userId]
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "Content not found!"};
	
	//check priv to view content
	let priv = await db.query(
		`SELECT 1 FROM |||users
		WHERE (
			(priv >= (SELECT visible FROM |||contents WHERE id = $2) AND id = $1)
			OR (SELECT visible FROM |||contents WHERE id = $2) = 0
		);`,
		[session.userId, contentId]
	);
	if (!priv) return {message: "No permission to view content"};
	
	//check priv to add comment
	if (!await checkPriv(session, "comment")) return {message: "No permission to add comment!"};
	
	//check if manager or commenter
	if (!await checkManager(session)) {
		let commenter = await db.query(
			`SELECT 1 FROM |||comments
			WHERE id = $1
			AND (
				password = $3
				OR commenter = $2
			);`,
			[commentId, session.userId, password]
		);
		if (commenter.error) return {message: "Error!"};
		if (!commenter.rowCount) return {message: "Only commenter can edit comment!"};
		
		let removed = await db.query(
			`SELECT 1 FROM |||comments WHERE id = $1 AND removed = 0;`,
			[commentId, session.userId],
		);
		if (removed.error) return {message: "Error!"};
		if (!removed.rowCount) return {message: "Cannot edit removed comment!"};
	}
	
	//edit content
	let date = data.date? data.date: null;
	let comment = data.comment? data.comment: "";
	comment = comment.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
	let visible = data.visible? data.visible: 0;
	
	let edited = await db.query(
		`UPDATE |||comments SET name = $2, date = $3, visible = $4, comment = $5
		WHERE id = $1
		AND (
			(SELECT priv FROM |||users WHERE id = $6) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $6
			OR removed = 0
		);`,
		[commentId, name, date, visible, comment, session.userId],
	);
	if (edited.error) return {message: "Error!"};
	let returning = await db.query(
		"SELECT id FROM |||comments WHERE id = $1;",
		[commentId],
	);
	if (returning.error) return {message: "Error!"};
	if (!returning.rowCount) return {message: "Could not update comment!"};
	trace(`${name} edited comment!`);
	return {message: "Comment edited!", edited: true, id: returning.rows[0].id};
}

//remove comment
router.delete("/remove/", async (req, res) => {
	let result = await removeComment(req.body, req.session);
	res.json(result);
});
async function removeComment(data, session) {
	let commentId = data.id;
	if (!commentId) return {message: "No comment id!"};
	
	//check name
	let name;
	let password;
	if (session.username) {
		name = session.username
		password = "";
	} else {
		name = data.name? data.name: "anonymous";
		password = data.password? data.password: "";
	}
	name = name.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
	let commenterId = session.userId? session.userId: 0;
	
	//check if manager or commenter
	if (!await checkManager(session)) {
		let commenter = await db.query(
			`SELECT 1 FROM |||comments
			WHERE id = $1
			AND (
				password = $3
				OR commenter = $2
			);`,
			[commentId, session.userId, password]
		);
		if (commenter.error) return {message: "Error!"};
		if (!commenter.rowCount) return {message: "Only commenter can remove comment!"};
	}
	
	//remove comment
	let removed = await db.query(`UPDATE |||comments SET removed = 1 WHERE id = $1;`, [commentId]);
	if (removed.error) return {message: "Error!"};
	trace(`${session.username || "anonymous" } removed comment!`);
	return {message: "Comment removed!", removed: true};
}

//restore comment
router.post("/restore/", async (req, res) => {
	let result = await restoreComment(req.body, req.session);
	res.json(result);
});
async function restoreComment(data, session) {
	let commentId = data.id;
	if (!commentId) return {message: "No comment id!"};
	
	//check if manager or commenter
	if (!await checkManager(session)) {
		let commenter = await db.query(
			`SELECT 1 FROM |||comments
			WHERE id = $1
			AND (
				password = $3
				OR commenter = $2
			);`,
			[commentId, session.userId, password]
		);
		if (commenter.error) return {message: "Error!"};
		if (!commenter.rowCount) return {message: "Only commenter can restore comment!"};
	}
	
	//restore comment
	let restored = await db.query(`UPDATE |||comments SET removed = 0 WHERE id = $1;`, [commentId]);
	if (restored.error) return {message: "Error!"};
	trace(`${session.username} restored comment!`);
	return {message: "Comment restored!", restored: true};
}

//delete comment
router.delete("/delete/", async (req, res) => {
	let result = await deleteComment(req.body, req.session);
	res.json(result);
});
async function deleteComment(data, session) {
	let commentId = data.id;
	if (!commentId) return {message: "No comment id!"};
	
	//check if manager
	if (!await checkManager(session)) return {message: "Only main can delete comment!"};
	
	//remove comment
	let deleted = await db.query(`DELETE FROM |||comments WHERE id = $1;`, [commentId]);
	if (deleted.error) return {message: "Error!"};
	trace(`${session.username} deleted comment!`);
	return {message: "Comment deleted!", deleted: true};
}

//list comments
router.get("/list/", async (req, res) => {
	let result = await listComments(req.query, req.session);
	res.json(result);
});
async function listComments(data, session) {
	//check if manager
	if (!await checkLogin(session)) return {message: "Not logged in!"};
	if (!await checkManager(session)) return {message: "No permission to list comments!"};
	
	let limit = parseInt(data.limit? data.limit: 100, 10);
	let offset = parseInt(data.offset? data.offset: 0, 10);
	
	//get all comments
	let result = await db.query(
		`SELECT c.id, n.id AS contentId, n.title, c.comment FROM |||comments AS c
		INNER JOIN |||contents AS n ON c.content = n.id
		WHERE c.removed = 0
		ORDER BY c.id DESC;`
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "No comments found!"};
	
	let comments = [];
	for (let i = offset; i < offset + limit; i++) {
		if (result.rows.length <= i || !result.rows[i]) break;
		comments.push(result.rows[i]);
	}
	
	return {message: "All comments listed!", all: true, comments: comments, count: result.rows.length};
}

//removed comments
router.get("/removed/", async (req, res) => {
	let result = await removedComments(req.query, req.session);
	res.json(result);
});
async function removedComments(data, session) {
	//check if manager
	if (!await checkLogin(session)) return {message: "Not logged in!"}
	if (!await checkManager(session)) return {message: "No permission to list removed comments!"};
	
	let limit = parseInt(data.limit? data.limit: 100, 10);
	let offset = parseInt(data.offset? data.offset: 0, 10);

	//get all removed comments
	let result = await db.query(
		`SELECT c.id, n.id AS contentId, n.title, c.comment FROM |||comments AS c
		INNER JOIN |||contents AS n ON c.content = n.id
		WHERE c.removed = 1
		ORDER BY c.id DESC;`
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "No comments found!"};
	
	let comments = [];
	for (let i = offset; i < offset + limit; i++) {
		if (result.rows.length <= i || !result.rows[i]) break;
		comments.push(result.rows[i]);
	}
	
	return {message: "Removed comments listed!", listed: true, comments: comments, count: result.rows.length};
}

module.exports = router;