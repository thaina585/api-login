const { Pool } = require('pg');

const url = process.env.DATABASE_URL;

// O endereço "externo" do banco do Render (termina em render.com) exige conexão segura (SSL).
// Quando o site roda dentro do Render, ele usa o endereço interno, que não exige.
const precisaSsl = url ? new URL(url).hostname.endsWith('render.com') : false;

const pool = new Pool({
  connectionString: url,
  ssl: precisaSsl ? { rejectUnauthorized: false } : false
});

// Executa um comando SQL e devolve as linhas. Os valores entram pelos $1, $2...
// e nunca colados no texto do comando (proteção contra SQL Injection).
async function consultar(sql, params = []) {
  const resultado = await pool.query(sql, params);
  return resultado.rows;
}

async function iniciar() {
  await consultar(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

module.exports = { iniciar, consultar };
