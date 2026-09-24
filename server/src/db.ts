import 'dotenv/config';
import mysql from 'mysql2/promise';

// Single shared pool. mysql2 parses JSON columns into JS values automatically,
// so `prereq_of` / `citations` / `answers` etc. come back already-parsed.
export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'pyramid',
  charset: 'utf8mb4',
  connectionLimit: 10,
  waitForConnections: true,
});
