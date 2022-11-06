const express = require("express");
const router = express.Router();
const db = require("./db");
const trace = require("./trace");

//json+urlencoded
router.use(express.json({limit: "5mb"}));
router.use(express.urlencoded({extended: false}));

//cors
const origins = process.env.ORIGINS.split("|");
router.use((req, res, next) => {
	let origin = req.headers.origin;
	if (origins.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
	res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	res.setHeader("Access-Control-Allow-Credentials", true);
	next();
});

//session
const session = require("express-session");
let store;
if (process.env.MYSQL) {
	store = new (require("express-mysql-session")(session))(
		{createDatabaseTable: true,},
		db.connect()
	);
} else {
	store = new (require("connect-pg-simple")(session))(
		{
			pool: db.connect(),
			createTableIfMissing: true,
		}
	);
}
router.use(session({
	store: store,
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: (process.env.LOCAL? false: true),
		sameSite: "none",
	},
}));

//check tables and create if not exist
require("./createTable");

//routes
router.use("/users/", require("./users"));
router.use("/contents/", require("./contents"));
router.use("/settings/", require("./settings"));
router.use("/comments/", require("./comments"));
router.use("/", require("./manage"));

module.exports = router;