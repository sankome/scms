//check tables and create if not exist
const db = require("./db");
const trace = require("./trace");

createTables();
async function createTables() {
	if (db.mysql) {
		//settings
		await db.query(
			`CREATE TABLE IF NOT EXISTS |||settings (
				name VARCHAR(20),
				value VARCHAR(20)
			);`
		);
		db.query(
			`INSERT INTO |||settings (name, value)
			SELECT 'main', 0
			WHERE NOT EXISTS (SELECT 1 FROM |||settings WHERE name = 'main');`
		);
		db.query(
			`INSERT INTO |||settings (name, value)
			SELECT 'manage', 10
			WHERE NOT EXISTS (SELECT 1 FROM |||settings WHERE name = 'manage');`
		);
		db.query(
			`INSERT INTO |||settings (name, value)
			SELECT 'create', 10
			WHERE NOT EXISTS (SELECT 1 FROM |||settings WHERE name = 'create');`
		);
		db.query(
			`INSERT INTO |||settings (name, value)
			SELECT 'edit', 1
			WHERE NOT EXISTS (SELECT 1 FROM |||settings WHERE name = 'edit');`
		);
		db.query(
			`INSERT INTO |||settings (name, value)
			SELECT 'comment', 0
			WHERE NOT EXISTS (SELECT 1 FROM |||settings WHERE name = 'comment');`
		);
		//users
		await db.query(
			`CREATE TABLE IF NOT EXISTS |||users (
				id SERIAL PRIMARY KEY,
				username VARCHAR(20),
				hash VARCHAR(255),
				salt VARCHAR(255),
				priv INT DEFAULT 0
			);`
		);
		//contents
		await db.query(
			`CREATE TABLE IF NOT EXISTS |||contents (
				id SERIAL PRIMARY KEY,
				creator INT REFERENCES |||users(id),
				date DATE DEFAULT CURRENT_DATE,
				visible INT,
				draft INT DEFAULT 0,
				unlisted INT DEFAULT 0,
				removed INT DEFAULT 0,
				type INT,
				category INT,
				title TEXT,
				slug TEXT,
				content TEXT,
				text TEXT
			);`
		);
		//comments
		await db.query(
			`CREATE TABLE IF NOT EXISTS |||comments (
				id SERIAL PRIMARY KEY,
				content INT REFERENCES |||contents(id),
				commenter INT REFERENCES |||users(id),
				name TEXT,
				date DATE DEFAULT CURRENT_DATE,
				visible INT,
				removed INT DEFAULT 0,
				comment TEXT
			);`
		);
	} else {
		//settings
		await db.query(
			`CREATE TABLE IF NOT EXISTS |||settings (
				name VARCHAR,
				value VARCHAR
			);`
		);
		db.query(
			`INSERT INTO |||settings (name, value)
			SELECT 'main', 0
			WHERE NOT EXISTS (SELECT 1 FROM |||settings WHERE name = 'main');`
		);
		db.query(
			`INSERT INTO |||settings (name, value)
			SELECT 'manage', 10
			WHERE NOT EXISTS (SELECT 1 FROM |||settings WHERE name = 'manage');`
		);
		db.query(
			`INSERT INTO |||settings (name, value)
			SELECT 'create', 10
			WHERE NOT EXISTS (SELECT 1 FROM |||settings WHERE name = 'create');`
		);
		db.query(
			`INSERT INTO |||settings (name, value)
			SELECT 'edit', 1
			WHERE NOT EXISTS (SELECT 1 FROM |||settings WHERE name = 'edit');`
		);
		db.query(
			`INSERT INTO |||settings (name, value)
			SELECT 'comment', 1
			WHERE NOT EXISTS (SELECT 1 FROM |||settings WHERE name = 'comment');`
		);
		//users
		await db.query(
			`CREATE TABLE IF NOT EXISTS |||users (
				id SERIAL PRIMARY KEY,
				username VARCHAR,
				hash VARCHAR,
				salt VARCHAR,
				priv INT DEFAULT 0
			);`
		);
		//contents
		await db.query(
			`CREATE TABLE IF NOT EXISTS |||contents (
				id SERIAL PRIMARY KEY,
				creator INT REFERENCES |||users(id),
				date DATE DEFAULT CURRENT_DATE,
				visible INT,
				draft INT DEFAULT 0,
				unlisted INT DEFAULT 0,
				removed INT DEFAULT 0,
				type INT,
				category INT,
				title TEXT,
				slug TEXT,
				content TEXT,
				text TEXT
			);`
		);
		//comments
		await db.query(
			`CREATE TABLE IF NOT EXISTS |||comments (
				id SERIAL PRIMARY KEY,
				content INT REFERENCES |||contents(id),
				commenter INT REFERENCES |||users(id),
				name TEXT,
				date DATE DEFAULT CURRENT_DATE,
				visible INT,
				removed INT DEFAULT 0,
				comment TEXT,
				password TEXT
			);`
		);
	}
	trace("tables checked!");
}