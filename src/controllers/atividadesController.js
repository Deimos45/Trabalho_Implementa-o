// src/controllers/atividadesController.js
const { validationResult } = require('express-validator');
const { readDB, writeDB, randomUUID } = require('../database/db');

// ============================================================
//  CRIAR atividade (Professor)
// ============================================================
exports.criar = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { titulo, descricao, prazo, quadro_id } = req.body;
    const db = readDB();

    const quadro     = db.quadros.find(q => q.id === quadro_id);
    const disciplina = quadro && db.disciplinas.find(d => d.id === quadro.disciplina_id && d.professor_id === req.usuario.id);
    if (!disciplina) return res.status(403).json({ erro: 'Quadro não encontrado ou sem permissão' });

    const atividade = {
      id:        randomUUID(),
      titulo:    titulo.trim(),
      descricao: descricao?.trim() || null,
      prazo:     prazo || null,
      status:    'a_fazer',
      quadro_id,
      criado_em: new Date().toISOString(),
    };
    db.atividades.push(atividade);
    writeDB(db);

    return res.status(201).json(atividade);
  } catch (err) { next(err); }
};

// ============================================================
//  DETALHAR atividade
// ============================================================
exports.detalhar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = readDB();

    const atividade  = db.atividades.find(a => a.id === id);
    if (!atividade) return res.status(404).json({ erro: 'Atividade não encontrada' });

    const quadro     = db.quadros.find(q => q.id === atividade.quadro_id);
    const disciplina = db.disciplinas.find(d => d.id === quadro?.disciplina_id);

    return res.json({
      ...atividade,
      quadro_titulo:   quadro?.titulo || null,
      disciplina_nome: disciplina?.nome || null,
    });
  } catch (err) { next(err); }
};

// ============================================================
//  EDITAR atividade (Professor)
// ============================================================
exports.editar = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { id } = req.params;
    const { titulo, descricao, prazo } = req.body;
    const db = readDB();

    const idx = db.atividades.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ erro: 'Atividade não encontrada ou sem permissão' });

    const quadro     = db.quadros.find(q => q.id === db.atividades[idx].quadro_id);
    const disciplina = db.disciplinas.find(d => d.id === quadro?.disciplina_id && d.professor_id === req.usuario.id);
    if (!disciplina) return res.status(404).json({ erro: 'Atividade não encontrada ou sem permissão' });

    if (titulo)          db.atividades[idx].titulo    = titulo.trim();
    if (descricao)       db.atividades[idx].descricao = descricao.trim();
    if (prazo !== undefined) db.atividades[idx].prazo = prazo || null;

    writeDB(db);
    return res.json(db.atividades[idx]);
  } catch (err) { next(err); }
};

// ============================================================
//  EXCLUIR atividade (Professor)
// ============================================================
exports.excluir = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = readDB();

    const idx = db.atividades.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ erro: 'Atividade não encontrada ou sem permissão' });

    const quadro     = db.quadros.find(q => q.id === db.atividades[idx].quadro_id);
    const disciplina = db.disciplinas.find(d => d.id === quadro?.disciplina_id && d.professor_id === req.usuario.id);
    if (!disciplina) return res.status(404).json({ erro: 'Atividade não encontrada ou sem permissão' });

    db.atividades.splice(idx, 1);
    writeDB(db);

    return res.json({ mensagem: 'Atividade removida com sucesso' });
  } catch (err) { next(err); }
};

// ============================================================
//  ATUALIZAR STATUS (Aluno — mover card no Kanban)
// ============================================================
exports.atualizarStatus = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { id }     = req.params;
    const { status } = req.body;
    const db = readDB();

    const idx = db.atividades.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ erro: 'Atividade não encontrada' });

    const quadro     = db.quadros.find(q => q.id === db.atividades[idx].quadro_id);
    const disciplina = db.disciplinas.find(d => d.id === quadro?.disciplina_id);

    const matriculado = disciplina && db.disciplina_alunos.find(
      da => da.disciplina_id === disciplina.id && da.aluno_id === req.usuario.id
    );
    if (!matriculado) {
      return res.status(403).json({ erro: 'Acesso negado. Você não está matriculado nesta disciplina.' });
    }

    db.atividades[idx].status = status;
    writeDB(db);

    return res.json({ mensagem: 'Status atualizado com sucesso', atividade: db.atividades[idx] });
  } catch (err) { next(err); }
};
