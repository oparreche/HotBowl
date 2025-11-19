import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const root = process.cwd();
const sqlPath = path.join(root, 'db', 'init.sql');

async function main() {
  const { DB_HOST = '127.0.0.1', DB_PORT = '3333', DB_USER = 'hotbowl', DB_PASS = 'hotbowl', DB_NAME = 'hotbowl' } = process.env;
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASS,
    multipleStatements: true,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await conn.query(`USE \`${DB_NAME}\``);
  await conn.query(sql);
  await conn.end();
  console.log('Database initialized successfully.');
}

main().catch((err) => {
  console.error('Failed to initialize database:', err?.message || err);
  process.exit(1);
});
