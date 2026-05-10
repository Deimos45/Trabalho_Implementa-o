// src/database/migrate.js
// Executa o schema.sql no banco de dados configurado

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const schemaPath = path.join(__dirname, '../../database/schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Arquivo schema.sql não encontrado em:', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('🔄 Executando migrations...');
  try {
    await pool.query(sql);
    console.log('✅ Schema criado com sucesso!');
  } catch (err) {
    // Ignora erro se tabelas já existem
    if (err.code === '42P07') {
      console.log('ℹ️  Tabelas já existem. Migration ignorada.');
    } else {
      console.error('❌ Erro na migration:', err.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

migrate();
