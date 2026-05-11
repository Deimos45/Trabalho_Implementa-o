// src/middlewares/auth.js
// Middlewares de autenticação e controle de acesso por papel

const jwt = require('jsonwebtoken');

// ============================================================
//  MIDDLEWARE: autenticar
//  Verifica o JWT no header Authorization: Bearer <token>
//  Injeta req.usuario com os dados do token
// ============================================================
function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario   = payload; // { id, email, papel, nome }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
    }
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

// ============================================================
//  MIDDLEWARE: apenasProfesor
//  Bloqueia acesso de alunos a rotas exclusivas de professores
// ============================================================
function apenasProfessor(req, res, next) {
  if (req.usuario?.papel !== 'professor') {
    return res.status(403).json({
      erro: 'Acesso negado. Apenas professores podem realizar esta ação.',
    });
  }
  next();
}

// ============================================================
//  MIDDLEWARE: apenasAluno
//  Bloqueia acesso de professores a rotas exclusivas de alunos
// ============================================================
function apenasAluno(req, res, next) {
  if (req.usuario?.papel !== 'aluno') {
    return res.status(403).json({
      erro: 'Acesso negado. Apenas alunos podem realizar esta ação.',
    });
  }
  next();
}

// ============================================================
//  MIDDLEWARE: professorOuAluno
//  Permite acesso a ambos os papéis (rota compartilhada)
// ============================================================
function professorOuAluno(req, res, next) {
  if (!['professor', 'aluno'].includes(req.usuario?.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }
  next();
}

module.exports = autenticar; // export padrão para uso simples
module.exports.autenticar       = autenticar;
module.exports.apenasProfessor  = apenasProfessor;
module.exports.apenasAluno      = apenasAluno;
module.exports.professorOuAluno = professorOuAluno;
