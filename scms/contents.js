const express = require("express");
const router = express.Router();
const db = require("./db");

const trace = require("./trace");
const checkLogin = require("./checks").checkLogin;
const checkManager = require("./checks").checkManager;
const checkPriv = require("./checks").checkPriv;
const checkCreator = require("./checks").checkCreator;

function limitAndTrim(result, offset, limit, trim) {
	let contents = [];
	for (let i = offset; i < offset + limit; i++) {
		if (result.rows.length <= i || !result.rows[i]) break;
		if (trim) result.rows[i].text = result.rows[i].text.substring(0, trim);
		contents.push(result.rows[i]);
	}
	return contents;
}

//add content
router.post("/add/", async (req, res) => {
	let result = await addContent(req.body, req.session);
	res.json(result);
});
async function addContent(data, session) {
	//check priv
	if (!await checkLogin(session)) return {message: "Not logged in!"};
	if (!await checkPriv(session, "edit")) return {message: "No permission to add content!"};
	
	//add content
	let date = data.date? data.date: null;
	let type = data.type? data.type: 0;
	let category = data.category? data.category: 0;
	let title = data.title? data.title: "untitled content";
	let content = data.content;
	let text = data.text? data.text: "";
	text = text.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
	let visible = data.visible? data.visible: 0;
	let draft = data.draft? data.draft: 0;
	let unlisted = data.unlisted? data.unlisted: 0;
	let slug = (data.slug && data.slug.trim().length)? data.slug: title;
	slug = slug.toLowerCase().trim().replace(/[\s]+/g, "-").replace(/[^a-z0-9-]+/g, "").replace(/^\-+-\-+$/g, "");
	
	let added = await db.query(
		"INSERT INTO |||contents (creator, date, visible, draft, unlisted, type, category, title, slug, content, text) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);",
		[session.userId, date, visible, draft, unlisted, type, category, title, slug, content, text],
	);
	if (added.error) return {message: "Error!"};
	let returning = await db.query(
		"SELECT id FROM |||contents WHERE creator = $1 AND visible = $2 AND draft = $3 AND unlisted = $4 AND type = $5 AND category = $6 AND title = $7 AND slug = $8 AND content = $9 AND text = $10;",
		[session.userId, visible, draft, unlisted, type, category, title, slug, content, text],
	);
	if (returning.error) return {message: "Error!"};
	trace(`${session.username} added content!`);
	return {message: "Content added!", added: true, id: returning.rows[0].id};
}

//edit content
router.put("/edit/", async (req, res) => {
	let result = await editContent(req.body, req.session);
	res.json(result);
});
async function editContent(data, session) {
	let contentId = data.id;
	if (!contentId) return {message: "No content id!"};
	
	//check priv
	if (!await checkLogin(session)) return {message: "Not logged in!"};
	if (!await checkPriv(session, "edit")) return {message: "No permission to edit content!"};
	if (!await checkCreator(session, contentId)) return {message: "Only creator can edit content!"};
	
	//check if content is not removed
	if (!await checkManager(session)) {
		let removed = await db.query(
			`SELECT 1 FROM |||contents WHERE id = $1 AND removed = 0;`,
			[contentId, session.userId],
		);
		if (removed.error) return {message: "Error!"};
		if (!removed.rowCount) return {message: "No permission to edit removed content!"};
	}
	
	//edit content
	let date = data.date? data.date: null;
	let type = data.type? data.type: 0;
	let category = data.category? data.category: 0;
	let title = data.title? data.title: "untitled content";
	let content = data.content;
	let text = data.text? data.text: "";
	text = text.replace(/\&/g, "&amp;").replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
	let visible = data.visible? data.visible: 0;
	let draft = data.draft? data.draft: 0;
	let unlisted = data.unlisted? data.unlisted: 0;
	let slug = (data.slug && data.slug.trim().length)? data.slug: title;
	slug = slug.toLowerCase().trim().replace(/[\s]+/g, "-").replace(/[^a-z0-9-]+/g, "").replace(/^\-+-\-+$/g, "");
	
	let edited = await db.query(
		`UPDATE |||contents SET date = $2, visible = $3, draft = $4, unlisted = $5, type = $6, category = $7, title = $8, slug = $9, content = $10, text = $11
		WHERE id = $1
		AND (
			(SELECT priv FROM |||users WHERE id = $12) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $12
			OR removed = 0
		);`,
		[contentId, date, visible, draft, unlisted, type, category, title, slug, content, text, session.userId],
	);
	if (edited.error) return {message: "Error!"};
	let returning = await db.query(
		`SELECT id FROM |||contents WHERE id = $1;`,
		[contentId],
	);
	if (returning.error) return {message: "Error!"};
	if (!returning.rowCount) return {message: "Could not update content!"};
	trace(`${session.username} edited content!`);
	return {message: "Content edited!", edited: true, id: returning.rows[0].id};
}

//remove content
router.delete("/remove/", async (req, res) => {
	let result = await removeContent(req.body, req.session);
	res.json(result);
});
async function removeContent(data, session) {
	let contentId = data.id;
	if (!contentId) return {message: "No content id!"};
	
	//check priv
	if (!await checkLogin(session)) return {message: "Not logged in!"};
	if (!await checkPriv(session, "edit")) return {message: "No permission to remove content!"};
	if (!await checkCreator(session, contentId)) return {message: "Only creator can remove content!"};
	
	//remove content
	let removed = await db.query("UPDATE |||contents SET removed = 1 WHERE id = $1;", [contentId]);
	if (removed.error) return {message: "Error!"};
	trace(`${session.username} removed content!`);
	return {message: "Content removed!", removed: true};
}

//restore content
router.post("/restore/", async (req, res) => {
	let result = await restoreContent(req.body, req.session);
	res.json(result);
});
async function restoreContent(data, session) {
	let contentId = data.id;
	if (!contentId) return {message: "No content id!"};
	
	//check if creator
	if (!await checkLogin(session)) return {message: "Not logged in!"};
	if (!await checkCreator(session, contentId)) return {message: "Only creator can restore content!"};
	
	//restore content
	let restored = await db.query("UPDATE |||contents SET removed = 0 WHERE id = $1;", [contentId]);
	if (restored.error) return {message: "Error!"};
	trace(`${session.username} restored content!`);
	return {message: "Content restored!", restored: true};
}

//delete content
router.delete("/delete/", async (req, res) => {
	let result = await deleteContent(req.body, req.session);
	res.json(result);
});
async function deleteContent(data, session) {
	let contentId = data.id;
	if (!contentId) return {message: "No content id!"};
	
	//check if manager
	if (!await checkLogin(session)) return {message: "Not logged in!"};
	if (!await checkManager(session)) return {message: "No permission to delete content!"};
	
	//remove content
	let deleted = await db.query("DELETE FROM |||contents WHERE id = $1;", [contentId]);
	if (deleted.error) return {message: "Error!"};
	trace(`${session.username} deleted content!`);
	return {message: "Content deleted!", deleted: true};
}

//view content
router.get("/view/", async (req, res) => {
	let result = await viewContent(req.query, req.session);
	res.json(result);
});
async function viewContent(data, session) {
	let contentId = data.id;
	let contentSlug = data.slug;
	if (!contentId && !contentSlug) return {message: "No content id or slug!"};
	let text = data.text? true: false;
	
	//check priv
	if (!await checkManager(session)) {
		let priv = await db.query(
			`SELECT 1 FROM |||users
			WHERE (
				(priv >= (SELECT visible FROM |||contents WHERE id = $2) AND id = $1)
				OR (SELECT visible FROM |||contents WHERE id = $2) = 0
			);`,
			[session.userId, contentId]
		);
		if (!priv) return {message: "No permission to view content"};
	}
	
	//check if content exists
	let result = await db.query(
		`SELECT c.id, u.username AS creator, c.date, c.visible, c.draft, c.unlisted, c.removed, c.type, c.category, c.title, c.slug, ${text? "c.text": "c.content"} FROM |||contents AS c
		INNER JOIN |||users AS u ON u.id = c.creator
		WHERE (c.id = $1 OR c.slug = $2)
		AND (
			(
				(SELECT priv FROM |||users WHERE id = $3) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $3
			)
			OR (
				(
					c.draft = 0
					OR c.creator = $3
				)
				AND (
					c.visible = 0
					OR (SELECT priv FROM |||users WHERE id = $3) >= c.visible
					OR c.creator = $3
				)
				AND (
					c.removed = 0
				)
			)
		);`,
		[contentId, contentSlug, session.userId]
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "Content not found!"};
	contentId = result.rows[0].id;
	
	//return content
	return {message: "Content viewed!", viewed: true, content: result.rows[0]};
}

//get all contents
router.get("/all/", async (req, res) => {
	let result = await getContents(req.query, req.session);
	res.json(result);
});
async function getContents(data, session) {
	let limit = parseInt(data.limit? data.limit: 100, 10);
	let offset = parseInt(data.offset? data.offset: 0, 10);
	let text = data.text? true: false;
	let trim = data.trim? data.trim: null;
	
	//get all contents
	let result = await db.query(
		`SELECT c.id, u.username AS creator, c.date, c.visible, c.draft, c.unlisted, c.removed, c.type, c.category, c.title, c.slug, c.${(text || trim)? "text": "content"} FROM |||contents AS c
		INNER JOIN |||users AS u ON u.id = c.creator
		WHERE (
			(
				(
					(SELECT priv FROM |||users WHERE id = $1) >= c.visible
					OR c.creator = $1
					OR c.visible = 0
				)
				AND c.unlisted = 0
			)
			OR (
				(SELECT priv FROM |||users WHERE id = $1) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1
			)
		)
		AND (
			c.draft = 0
			OR (
				(SELECT priv FROM |||users WHERE id = $1) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1
				OR c.creator = $1
			)
		)
		AND c.removed = 0
		ORDER BY c.id DESC;`,
		[session.userId]
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "No contents found!"};
	
	let contents = limitAndTrim(result, offset, limit, trim);
	
	return {message: "All contents listed!", all: true, contents: contents, count: result.rows.length};
}

//list contents
router.get("/list/", async (req, res) => {
	let result = await listContents(req.query, req.session);
	res.json(result);
});
async function listContents(data, session) {
	let limit = parseInt(data.limit? data.limit: 100, 10);
	let offset = parseInt(data.offset? data.offset: 0, 10);
	let text = data.text? true: false;
	let trim = data.trim? data.trim: null;

	//get all listed contents
	let result = await db.query(
		`SELECT c.id, u.username AS creator, c.date, c.visible, c.draft, c.unlisted, c.removed, c.type, c.category, c.title, c.slug, c.${(text || trim)? "text": "content"} FROM |||contents AS c
		INNER JOIN |||users AS u ON u.id = c.creator
		WHERE (
			(SELECT priv FROM |||users WHERE id = $1) >= c.visible
			OR (SELECT priv FROM |||users WHERE id = $1) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1
			OR c.creator = $1
			OR c.visible = 0
		)
		AND (
			c.draft = 0
			OR (
				(SELECT priv FROM |||users WHERE id = $1) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1
				OR c.creator = $1
			)
		)
		AND c.removed = 0
		AND c.unlisted = 0
		ORDER BY c.id DESC;`,
		[session.userId],
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "No contents found!"};
	
	let contents = limitAndTrim(result, offset, limit, trim);
	
	return {message: "Listed contents listed!", listed: true, contents: contents, count: result.rows.length};
}

//unlisted contents
router.get("/unlist/", async (req, res) => {
	let result = await unlistContents(req.query, req.session);
	res.json(result);
});
async function unlistContents(data, session) {
	let limit = parseInt(data.limit? data.limit: 100, 10);
	let offset = parseInt(data.offset? data.offset: 0, 10);
	let text = data.text? true: false;
	let trim = data.trim? data.trim: null;

	//get all unlisted contents
	let result = await db.query(
		`SELECT c.id, u.username AS creator, c.date, c.visible, c.draft, c.unlisted, c.removed, c.type, c.category, c.title, c.slug, c.${(text || trim)? "text": "content"} FROM |||contents AS c
		INNER JOIN |||users AS u ON u.id = c.creator
		WHERE (
			(SELECT priv FROM |||users WHERE id = $1) >= c.visible
			OR (SELECT priv FROM |||users WHERE id = $1) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1
			OR c.creator = $1
			OR c.visible = 0
		)
		AND (
			c.draft = 0
			OR (
				(SELECT priv FROM |||users WHERE id = $1) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1
				OR c.creator = $1
			)
		)
		AND c.removed = 0
		AND unlisted = 1
		ORDER BY c.id DESC;`,
		[session.userId],
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "No contents found!"};
	
	let contents = limitAndTrim(result, offset, limit, trim);
	
	return {message: "Unlisted contents listed!", listed: true, contents: contents, count: result.rows.length};
}

//removed contents
router.get("/removed/", async (req, res) => {
	let result = await removedContents(req.query, req.session);
	res.json(result);
});
async function removedContents(data, session) {
	//check priv
	if (!await checkLogin(session)) return {message: "Not logged in!"};
	if (!await checkManager(session)) return {message: "No permission to list removed contents!"};
		
	let limit = parseInt(data.limit? data.limit: 100, 10);
	let offset = parseInt(data.offset? data.offset: 0, 10);
	let text = data.text? true: false;
	let trim = data.trim? data.trim: null;

	//get all removed contents
	let result = await db.query(
		`SELECT c.id, u.username AS creator, c.date, c.visible, c.draft, c.unlisted, c.removed, c.type, c.category, c.title, c.slug, c.content, c.text FROM |||contents AS c
		INNER JOIN |||users AS u ON u.id = c.creator
		WHERE (
			(SELECT priv FROM |||users WHERE id = $1) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1
		)
		AND c.removed = 1
		ORDER BY c.id DESC;`,
		[session.userId]
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "No contents found!"};
	
	let contents = limitAndTrim(result, offset, limit, trim);
	
	return {message: "Removed contents listed!", listed: true, contents: contents, count: result.rows.length};
}

//search contents
router.get("/search/", async (req, res) => {
	let result = await searchContents(req.query, req.session);
	res.json(result);
});
async function searchContents(data, session) {
	let search = data.search;
	let limit = parseInt(data.limit? data.limit: 100, 10);
	let offset = parseInt(data.offset? data.offset: 0, 10);
	let text = data.text? true: false;
	let trim = data.trim? data.trim: null;
	
	//search content
	let result = await db.query(
		`SELECT c.id, u.username AS creator, c.date, c.visible, c.draft, c.unlisted, c.removed, c.type, c.category, c.title, c.slug, c.${(text || trim)? "text": "content"} FROM |||contents AS c
		INNER JOIN |||users AS u ON u.id = c.creator
		WHERE (
			(
				(
					(SELECT priv FROM |||users WHERE id = $1) >= c.visible
					OR c.creator = $1
					OR c.visible = 0
				)
				AND c.unlisted = 0
			)
			OR (
				(SELECT priv FROM |||users WHERE id = $1) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1
			)
		)
		AND (
			c.draft = 0
			OR (
				(SELECT priv FROM |||users WHERE id = $1) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $1
				OR c.creator = $1
			)
		)
		AND c.removed = 0
		AND c.text LIKE $2
		ORDER BY c.id DESC;`,
		[session.userId, "%" + search + "%"]
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "No contents found!"};
	
	let contents = limitAndTrim(result, offset, limit, trim);
	
	return {message: "Searched contents listed!", search: true, contents: contents, count: result.rows.length};
}

//get comments
router.get("/comments/", async (req, res) => {
	let result = await getComments(req.query, req.session);
	res.json(result);
});
async function getComments(data, session) {
	let contentId = data.id;
	let contentSlug = data.slug;
	if (!contentId && !contentSlug) return {message: "No content id or slug!"};
	
	//check priv
	if (!await checkManager(session)) {
		let priv = await db.query(
			`SELECT 1 FROM |||users
			WHERE (
				(priv >= (SELECT visible FROM |||contents WHERE id = $2) AND id = $1)
				OR (SELECT visible FROM |||contents WHERE id = $2) = 0
			);`,
			[session.userId, contentId]
		);
		if (!priv) return {message: "No permission to view content"};
	}
	
	//check if content exists
	let exists = await db.query(
		`SELECT c.id FROM |||contents AS c
		INNER JOIN |||users AS u ON u.id = c.creator
		WHERE (c.id = $1 OR c.slug = $2)
		AND (
			c.draft = 0
			OR (
				(SELECT priv FROM |||users WHERE id = $3) >= c.visible
				OR (SELECT priv FROM |||users WHERE id = $3) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
				OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $3
				OR c.creator = $3
			)
		)
		AND (
			(SELECT priv FROM |||users WHERE id = $3) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $3
			OR c.removed = 0
		);`,
		[contentId, contentSlug, session.userId]
	);
	if (exists.error) return {message: "Error!"};
	if (!exists.rowCount) return {message: "Content not found!"};
	if (!contentId) contentId = exists.rows[0].id;
	
	let limit = parseInt(data.limit? data.limit: 100, 10);
	let offset = parseInt(data.offset? data.offset: 0, 10);
	
	//get comments
	let result = await db.query(
		`SELECT * FROM |||comments
		WHERE content = $1
		AND removed = 0
		AND (
			(SELECT priv FROM |||users WHERE id = $2) >= visible
			OR visible = 0
			OR (SELECT priv FROM |||users WHERE id = $2) >= (SELECT value::INT FROM |||settings WHERE name = 'manage')
			OR (SELECT value::INT FROM |||settings WHERE name = 'main') = $2
			OR commenter = $2
		)
		ORDER BY id ASC;`,
		[contentId, session.userId]
	);
	if (result.error) return {message: "Error!"};
	if (!result.rowCount) return {message: "No comments found!"};
	
	while (offset >= result.rows.length) offset -= limit;
	
	let comments = [];
	for (let i = offset; i < offset + limit; i++) {
		if (result.rows.length <= i || !result.rows[i]) break;
		comments.push(result.rows[i]);
	}
	
	return {message: "Comments listed!", listed: true, comments: comments, count: result.rows.length};
}

module.exports = router;