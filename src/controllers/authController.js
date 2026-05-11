// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { readDB, writeDB, randomUUID } = require('../database/db');

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, papel: usuario.papel, nome: usuario.nome },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function buscarPerfil(db, usuarioId, papel) {
  if (papel === 'professor') return db.professores.find(p => p.usuario_id === usuarioId) || {};
  if (papel === 'aluno')     return db.alunos.find(a => a.usuario_id === usuarioId) || {};
  return {};
}

// ============================================================
//  LOGIN
// ============================================================
exports.login = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { email, senha } = req.body;
    const db = readDB();

    const usuario = db.usuarios.find(u => u.email === email.toLowerCase().trim());
    if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const perfil = buscarPerfil(db, usuario.id, usuario.papel);
    const token  = gerarToken(usuario);

    return res.json({
      token,
      usuario: {
        id:        usuario.id,
        nome:      usuario.nome,
        email:     usuario.email,
        papel:     usuario.papel,
        matricula: perfil.matricula,
      },
    });
  } catch (err) { next(err); }
};

// ============================================================
//  REGISTER
// ============================================================
exports.register = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { nome, email, senha, papel, matricula } = req.body;
    const db = readDB();

    // E-mail duplicado
    if (db.usuarios.find(u => u.email === email.toLowerCase().trim())) {
      return res.status(409).json({ erro: 'E-mail já cadastrado' });
    }

    // Matrícula duplicada
    const tabelaPerfil = papel === 'professor' ? db.professores : db.alunos;
    if (tabelaPerfil.find(p => p.matricula === matricula.trim())) {
      return res.status(409).json({ erro: 'Matrícula já cadastrada' });
    }

    const rounds    = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const senhaHash = await bcrypt.hash(senha, rounds);

    const usuario = {
      id:         randomUUID(),
      nome:       nome.trim(),
      email:      email.toLowerCase().trim(),
      senha_hash: senhaHash,
      papel,
      criado_em:  new Date().toISOString(),
    };
    db.usuarios.push(usuario);

    const perfil = { usuario_id: usuario.id, matricula: matricula.trim() };
    if (papel === 'professor') db.professores.push(perfil);
    else                       db.alunos.push(perfil);

    writeDB(db);

    const token = gerarToken(usuario);
    return res.status(201).json({
      token,
      usuario: {
        id:        usuario.id,
        nome:      usuario.nome,
        email:     usuario.email,
        papel:     usuario.papel,
        matricula: matricula.trim(),
      },
    });
  } catch (err) { next(err); }
};

// ============================================================
//  ME — Dados do usuário autenticado
// ============================================================
exports.me = async (req, res, next) => {
  try {
    const db      = readDB();
    const usuario = db.usuarios.find(u => u.id === req.usuario.id);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

    const perfil = buscarPerfil(db, usuario.id, usuario.papel);
    const { senha_hash, ...usuarioSemSenha } = usuario;
    return res.json({ ...usuarioSemSenha, ...perfil });
  } catch (err) { next(err); }
};
