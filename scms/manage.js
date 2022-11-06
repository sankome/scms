const express = require("express");
const router = express.Router();
const path = require("path");
const trace = require("./trace");

//files
const fs = require("fs");
router.get("/:page", (req, res) => {
	let page = req.params.page;
	if (page != "user-create" && page != "user-login") {
		if (!req.session.username || !req.session.userId || !req.session.manage) {
			req.session.destroy();
			res.redirect("./user-login");
			return;
		}
	}
	let file = path.join(__dirname + "/html/" + page + ".html");
	if (fs.existsSync(file)) res.sendFile(file);
	else res.sendFile(path.join(__dirname + "/html/index.html"));
});
router.get("/", (req, res) => {
	if (!req.originalUrl.endsWith("/")) {
		res.redirect(req.originalUrl + "/");
		return;
	}
	if (!req.session.username || !req.session.userId || !req.session.manage) {
		req.session.destroy();
		res.redirect("./user-login");
		return;
	} else {
		res.sendFile(path.join(__dirname + "/html/index.html"));
	}
});
router.get("/js/:file", async (req, res) => {
	let file = path.join(__dirname + "/js/" + req.params.file);
	if (fs.existsSync(file)) res.sendFile(file);
	else res.send("empty file!");
});
router.get("/css/:file", (req, res) => {
	let file = path.join(__dirname + "/css/" + req.params.file);
	if (fs.existsSync(file)) res.sendFile(file);
	else res.send("empty file!");
});

module.exports = router;