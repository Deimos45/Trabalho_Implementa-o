// src/server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

require('./database/db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://seudominio.com' : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
//  ROTAS DA API
// ============================================================
app.use('/api/auth', require('./routes/auth'));
// Parte 3: adicionar disciplinas, atividades, quadros

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), ambiente: process.env.NODE_ENV });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, req, res, _next) => {
  console.error('🔥 Erro:', err.stack);
  res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
