// src/controllers/atividadesController.js
const { validationResult } = require('express-validator');
const { query } = require('../database/db');

// ============================================================
//  CRIAR atividade — UC_02 (Professor)
// ============================================================
exports.criar = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { titulo, descricao, prazo, quadro_id } = req.body;

    // Verifica se o quadro pertence a uma disciplina do professor
    const quadroCheck = await query(
      `SELECT q.id FROM quadros q
       JOIN disciplinas d ON d.id = q.disciplina_id
       WHERE q.id = $1 AND d.professor_id = $2`,
      [quadro_id, req.usuario.id]
    );

    if (quadroCheck.rows.length === 0) {
      return res.status(403).json({ erro: 'Quadro não encontrado ou sem permissão' });
    }

    const resultado = await query(
      `INSERT INTO atividades (titulo, descricao, prazo, quadro_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [titulo.trim(), descricao?.trim() || null, prazo || null, quadro_id]
    );

    return res.status(201).json(resultado.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  DETALHAR atividade — UC_04 (Professor e Aluno)
// ============================================================
exports.detalhar = async (req, res, next) => {
  try {
    const { id } = req.params;

    const resultado = await query(
      `SELECT a.*, q.titulo AS quadro_titulo, d.nome AS disciplina_nome
       FROM atividades a
       JOIN quadros q ON q.id = a.quadro_id
       JOIN disciplinas d ON d.id = q.disciplina_id
       WHERE a.id = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Atividade não encontrada' });
    }

    return res.json(resultado.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  EDITAR atividade — UC_03 (Professor)
// ============================================================
exports.editar = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { id } = req.params;
    const { titulo, descricao, prazo } = req.body;

    // Verifica se a atividade pertence a uma disciplina do professor
    const check = await query(
      `SELECT a.id FROM atividades a
       JOIN quadros q ON q.id = a.quadro_id
       JOIN disciplinas d ON d.id = q.disciplina_id
       WHERE a.id = $1 AND d.professor_id = $2`,
      [id, req.usuario.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ erro: 'Atividade não encontrada ou sem permissão' });
    }

    const resultado = await query(
      `UPDATE atividades
       SET titulo    = COALESCE($1, titulo),
           descricao = COALESCE($2, descricao),
           prazo     = COALESCE($3, prazo)
       WHERE id = $4
       RETURNING *`,
      [titulo?.trim(), descricao?.trim(), prazo || null, id]
    );

    return res.json(resultado.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  EXCLUIR atividade — UC_05 (Professor)
// ============================================================
exports.excluir = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verifica posse antes de excluir
    const check = await query(
      `SELECT a.id FROM atividades a
       JOIN quadros q ON q.id = a.quadro_id
       JOIN disciplinas d ON d.id = q.disciplina_id
       WHERE a.id = $1 AND d.professor_id = $2`,
      [id, req.usuario.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ erro: 'Atividade não encontrada ou sem permissão' });
    }

    await query('DELETE FROM atividades WHERE id = $1', [id]);

    return res.json({ mensagem: 'Atividade removida com sucesso' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  ATUALIZAR STATUS — UC_06 (Aluno — mover card no Kanban)
//  Valida se o aluno está matriculado na disciplina do quadro
// ============================================================
exports.atualizarStatus = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { id }     = req.params;
    const { status } = req.body;

    // Verifica se o aluno está matriculado na disciplina desta atividade
    const check = await query(
      `SELECT a.id FROM atividades a
       JOIN quadros q ON q.id = a.quadro_id
       JOIN disciplinas d ON d.id = q.disciplina_id
       JOIN disciplina_alunos da ON da.disciplina_id = d.id
       WHERE a.id = $1 AND da.aluno_id = $2`,
      [id, req.usuario.id]
    );

    if (check.rows.length === 0) {
      // Coluna inválida / sem acesso → "Exibir aviso" (Diagrama Atividade 2)
      return res.status(403).json({
        erro: 'Acesso negado. Você não está matriculado nesta disciplina.',
      });
    }

    const resultado = await query(
      `UPDATE atividades SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    return res.json({
      mensagem: 'Status atualizado com sucesso',
      atividade: resultado.rows[0],
    });
  } catch (err) {
    next(err);
  }
};
