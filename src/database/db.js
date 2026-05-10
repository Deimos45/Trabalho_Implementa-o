// src/database/db.js
// Pool de conexão com PostgreSQL usando o módulo 'pg'

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'kanban_academico',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Limites do pool de conexões
  max:              10,   // máximo de conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Testa a conexão ao inicializar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar ao PostgreSQL:', err.message);
    process.exit(1);
  }
  release();
  console.log('✅ PostgreSQL conectado com sucesso!');
});

/**
 * Executa uma query com parâmetros opcionais.
 * @param {string} text  - SQL com placeholders ($1, $2, ...)
 * @param {Array}  params - Valores para os placeholders
 * @returns {Promise<QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtém um client do pool para transações manuais.
 * Lembre-se de chamar client.release() após o uso.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
