// src/database/db.js
// Armazenamento em arquivo JSON local (substitui PostgreSQL)

const fs   = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DB_PATH = path.join(__dirname, '../../data/db.json');

const defaultDB = {
  usuarios:          [],
  professores:       [],
  alunos:            [],
  disciplinas:       [],
  quadros:           [],
  atividades:        [],
  disciplina_alunos: [],
};

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    writeDB(defaultDB);
    return JSON.parse(JSON.stringify(defaultDB));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Inicializa o arquivo se não existir
readDB();
console.log('✅ Banco de dados JSON iniciado em:', DB_PATH);

module.exports = { readDB, writeDB, randomUUID };
