// src/controllers/disciplinasController.js
const { validationResult } = require('express-validator');
const { readDB, writeDB, randomUUID } = require('../database/db');

// ============================================================
//  LISTAR disciplinas
// ============================================================
exports.listar = async (req, res, next) => {
  try {
    const db = readDB();

    if (req.usuario.papel === 'professor') {
      const disciplinas = db.disciplinas
        .filter(d => d.professor_id === req.usuario.id)
        .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
        .map(d => {
          const quadrosIds      = db.quadros.filter(q => q.disciplina_id === d.id).map(q => q.id);
          const total_alunos    = db.disciplina_alunos.filter(da => da.disciplina_id === d.id).length;
          const total_atividades = db.atividades.filter(a => quadrosIds.includes(a.quadro_id)).length;
          return { ...d, total_alunos, total_atividades };
        });
      return res.json(disciplinas);
    }

    // Aluno — vê apenas as que está matriculado
    const matriculas  = db.disciplina_alunos.filter(da => da.aluno_id === req.usuario.id);
    const disciplinas = matriculas
      .map(da => {
        const disc      = db.disciplinas.find(d => d.id === da.disciplina_id);
        if (!disc) return null;
        const professor = db.usuarios.find(u => u.id === disc.professor_id);
        return { ...disc, professor_nome: professor?.nome };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

    return res.json(disciplinas);
  } catch (err) { next(err); }
};

// ============================================================
//  CRIAR disciplina + quadro (Professor)
// ============================================================
exports.criar = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { nome } = req.body;
    const db = readDB();

    const disciplina = {
      id:           randomUUID(),
      nome:         nome.trim(),
      professor_id: req.usuario.id,
      criado_em:    new Date().toISOString(),
    };
    db.disciplinas.push(disciplina);

    const quadro = {
      id:            randomUUID(),
      titulo:        `Quadro - ${nome.trim()}`,
      disciplina_id: disciplina.id,
    };
    db.quadros.push(quadro);

    writeDB(db);
    return res.status(201).json({ ...disciplina, quadro });
  } catch (err) { next(err); }
};

// ============================================================
//  DETALHAR disciplina
// ============================================================
exports.detalhar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = readDB();

    const disciplina = db.disciplinas.find(d => d.id === id);
    if (!disciplina) return res.status(404).json({ erro: 'Disciplina não encontrada' });

    if (req.usuario.papel === 'professor' && disciplina.professor_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Acesso negado a esta disciplina' });
    }

    const professor = db.usuarios.find(u => u.id === disciplina.professor_id);
    const quadro    = db.quadros.find(q => q.disciplina_id === disciplina.id);

    return res.json({
      ...disciplina,
      professor_nome: professor?.nome,
      quadro_id:      quadro?.id,
      quadro_titulo:  quadro?.titulo,
    });
  } catch (err) { next(err); }
};

// ============================================================
//  EDITAR disciplina (Professor dono)
// ============================================================
exports.editar = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { id }   = req.params;
    const { nome } = req.body;
    const db = readDB();

    const idx = db.disciplinas.findIndex(d => d.id === id && d.professor_id === req.usuario.id);
    if (idx === -1) return res.status(404).json({ erro: 'Disciplina não encontrada ou sem permissão' });

    db.disciplinas[idx].nome = nome.trim();
    writeDB(db);
    return res.json(db.disciplinas[idx]);
  } catch (err) { next(err); }
};

// ============================================================
//  EXCLUIR disciplina — cascade manual
// ============================================================
exports.excluir = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = readDB();

    const idx = db.disciplinas.findIndex(d => d.id === id && d.professor_id === req.usuario.id);
    if (idx === -1) return res.status(404).json({ erro: 'Disciplina não encontrada ou sem permissão' });

    const quadrosIds = db.quadros.filter(q => q.disciplina_id === id).map(q => q.id);
    db.atividades        = db.atividades.filter(a => !quadrosIds.includes(a.quadro_id));
    db.quadros           = db.quadros.filter(q => q.disciplina_id !== id);
    db.disciplina_alunos = db.disciplina_alunos.filter(da => da.disciplina_id !== id);
    db.disciplinas.splice(idx, 1);

    writeDB(db);
    return res.json({ mensagem: 'Disciplina excluída com sucesso' });
  } catch (err) { next(err); }
};

// ============================================================
//  MATRICULAR ALUNO na disciplina
// ============================================================
exports.matricularAluno = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { id }       = req.params;
    const { aluno_id } = req.body;
    const db = readDB();

    const disciplina = db.disciplinas.find(d => d.id === id && d.professor_id === req.usuario.id);
    if (!disciplina) return res.status(404).json({ erro: 'Disciplina não encontrada ou sem permissão' });

    const aluno = db.alunos.find(a => a.usuario_id === aluno_id);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });

    const jaMatriculado = db.disciplina_alunos.find(da => da.disciplina_id === id && da.aluno_id === aluno_id);
    if (!jaMatriculado) {
      db.disciplina_alunos.push({ disciplina_id: id, aluno_id });
      writeDB(db);
    }

    return res.json({ mensagem: 'Aluno matriculado com sucesso' });
  } catch (err) { next(err); }
};

// ============================================================
//  VER QUADRO completo da disciplina (Kanban)
// ============================================================
exports.verQuadro = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = readDB();

    const disciplina = db.disciplinas.find(d => d.id === id);
    const quadro     = db.quadros.find(q => q.disciplina_id === id);
    if (!quadro || !disciplina) return res.status(404).json({ erro: 'Quadro não encontrado' });

    const atividades = db.atividades
      .filter(a => a.quadro_id === quadro.id)
      .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));

    return res.json({
      id:              quadro.id,
      titulo:          quadro.titulo,
      disciplina_nome: disciplina.nome,
      colunas: {
        a_fazer:      atividades.filter(a => a.status === 'a_fazer'),
        em_andamento: atividades.filter(a => a.status === 'em_andamento'),
        concluido:    atividades.filter(a => a.status === 'concluido'),
      },
    });
  } catch (err) { next(err); }
};
