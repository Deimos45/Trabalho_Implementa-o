// src/server.js
// Ponto de entrada principal do servidor Express

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Inicializa conexão com banco (efeito colateral do require)
require('./database/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ============================================================
//  MIDDLEWARES GLOBAIS
// ============================================================
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://seudominio.com'
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
//  ROTAS DA API
// ============================================================
// As rotas serão adicionadas nas próximas partes:
// app.use('/api/auth',        require('./routes/auth'));
// app.use('/api/disciplinas', require('./routes/disciplinas'));
// app.use('/api/atividades',  require('./routes/atividades'));
// app.use('/api/quadros',     require('./routes/quadros'));

// Placeholder de health-check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV,
  });
});

// Rota catch-all: serve o frontend para rotas não encontradas
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============================================================
//  MIDDLEWARE DE TRATAMENTO DE ERROS (deve ser o último)
// ============================================================
app.use((err, req, res, _next) => {
  console.error('🔥 Erro não tratado:', err.stack);
  res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================================
//  INICIA O SERVIDOR
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
