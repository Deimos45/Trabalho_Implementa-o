// src/controllers/authController.js
const bcrypt              = require('bcrypt');
const jwt                 = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query, getClient } = require('../database/db');

// ============================================================
//  HELPERS
// ============================================================

/**
 * Gera um JWT com os dados do usuário.
 */
function gerarToken(usuario) {
  return jwt.sign(
    {
      id:    usuario.id,
      email: usuario.email,
      papel: usuario.papel,
      nome:  usuario.nome,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

/**
 * Busca dados extras do perfil (matricula) conforme o papel.
 */
async function buscarPerfil(usuarioId, papel) {
  if (papel === 'professor') {
    const res = await query(
      'SELECT matricula FROM professores WHERE usuario_id = $1',
      [usuarioId]
    );
    return res.rows[0] || {};
  }
  if (papel === 'aluno') {
    const res = await query(
      'SELECT matricula FROM alunos WHERE usuario_id = $1',
      [usuarioId]
    );
    return res.rows[0] || {};
  }
  return {};
}

// ============================================================
//  LOGIN
//  Fluxo: verifica email → compara senha → gera JWT
//  Retorna papel diferenciado (professor | aluno)
// ============================================================
exports.login = async (req, res, next) => {
  try {
    // 1. Valida campos do body
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    const { email, senha } = req.body;

    // 2. Busca usuário pelo e-mail
    const resultado = await query(
      'SELECT id, nome, email, senha_hash, papel FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const usuario = resultado.rows[0];

    // 3. Compara senha com hash (bcrypt)
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    // 4. Busca dados extras do perfil
    const perfil = await buscarPerfil(usuario.id, usuario.papel);

    // 5. Gera token JWT
    const token = gerarToken(usuario);

    // 6. Retorna token + dados do usuário (sem senha)
    return res.json({
      token,
      usuario: {
        id:       usuario.id,
        nome:     usuario.nome,
        email:    usuario.email,
        papel:    usuario.papel,
        matricula: perfil.matricula,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  REGISTER
//  Cria usuário base + perfil (professor ou aluno) em transação
// ============================================================
exports.register = async (req, res, next) => {
  const client = await getClient();
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    const { nome, email, senha, papel, matricula } = req.body;

    // Inicia transação (atomicidade: ou cria tudo ou nada)
    await client.query('BEGIN');

    // Verifica e-mail duplicado
    const emailExiste = await client.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (emailExiste.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ erro: 'E-mail já cadastrado' });
    }

    // Hash da senha
    const rounds    = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const senhaHash = await bcrypt.hash(senha, rounds);

    // Insere na tabela base usuarios
    const novoUsuario = await client.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, $4) RETURNING id, nome, email, papel`,
      [nome.trim(), email.toLowerCase().trim(), senhaHash, papel]
    );
    const usuario = novoUsuario.rows[0];

    // Insere na tabela específica do papel
    if (papel === 'professor') {
      await client.query(
        'INSERT INTO professores (usuario_id, matricula) VALUES ($1, $2)',
        [usuario.id, matricula.trim()]
      );
    } else {
      await client.query(
        'INSERT INTO alunos (usuario_id, matricula) VALUES ($1, $2)',
        [usuario.id, matricula.trim()]
      );
    }

    await client.query('COMMIT');

    // Gera token já no cadastro (login automático)
    const token = gerarToken(usuario);

    return res.status(201).json({
      token,
      usuario: {
        id:       usuario.id,
        nome:     usuario.nome,
        email:    usuario.email,
        papel:    usuario.papel,
        matricula: matricula.trim(),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    // Matrícula duplicada
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Matrícula já cadastrada' });
    }
    next(err);
  } finally {
    client.release();
  }
};

// ============================================================
//  ME — Retorna dados do usuário autenticado (via token)
// ============================================================
exports.me = async (req, res, next) => {
  try {
    const resultado = await query(
      'SELECT id, nome, email, papel, criado_em FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const usuario = resultado.rows[0];
    const perfil  = await buscarPerfil(usuario.id, usuario.papel);

    return res.json({ ...usuario, ...perfil });
  } catch (err) {
    next(err);
  }
};
