const pg = require("pg");
const m = require("mysql2/promise");
let pool;
let mysql = process.env.MYSQL;

//prefix for table names
let prefix = "sc_";
if (process.env.TABLE_PREFIX) {
	//remove all special characters for custom table prefix
	prefix = process.env.TABLE_PREFIX.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "");
	if (!prefix.length) prefix = "sc";
	prefix += "_";
}

//create database pool
function connect() {
	if (pool) return pool;
	if (mysql) {
		pool = m.createPool({
			host: process.env.DATABASE_HOST,
			user: process.env.DATABASE_USER,
			password: process.env.DATABASE_PASSWORD,
			database: process.env.DATABASE,
			port: process.env.DATABASE_PORT,
			namedPlaceholders: true,
		});
	} else {
		pool = new pg.Pool({connectionString: process.env.DATABASE_URL,});
	}
	return pool;
}

//query database
async function query(sql, values) {
	//replace ||| with table prefix
	sql = sql.replace(/\|\|\|/g, prefix);
	
	//change syntax for mysql
	if (mysql) {
		sql = sql.replace(/\$/g, ":");
		sql = sql.replace(/\:\:INT/g, "");
		if (values) {
			let newValues = {};
			for (let i = 0; i < values.length; i++) {
				newValues[i + 1] = values[i]? values[i]: "";
			}
			values = newValues;
		}
	}
	
	try {
		let result = await pool.query(sql, values);
		
		//change result format for mysql
		if (mysql) return {rowCount: result[0].length, rows: result[0]};
		
		return result;
	} catch (error) {
		console.log(sql);
		console.error(error);
		return {error: true};
	}
}

module.exports = {
	connect,
	query,
	mysql,
}