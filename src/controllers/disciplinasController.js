// src/controllers/disciplinasController.js
const { validationResult } = require('express-validator');
const { query, getClient } = require('../database/db');

// ============================================================
//  LISTAR disciplinas
//  Professor → vê apenas as suas
//  Aluno     → vê apenas as que está matriculado
// ============================================================
exports.listar = async (req, res, next) => {
  try {
    let resultado;

    if (req.usuario.papel === 'professor') {
      resultado = await query(
        `SELECT d.id, d.nome, d.criado_em,
                COUNT(DISTINCT da.aluno_id)  AS total_alunos,
                COUNT(DISTINCT a.id)         AS total_atividades
         FROM disciplinas d
         LEFT JOIN disciplina_alunos da ON da.disciplina_id = d.id
         LEFT JOIN quadros q ON q.disciplina_id = d.id
         LEFT JOIN atividades a ON a.quadro_id = q.id
         WHERE d.professor_id = $1
         GROUP BY d.id
         ORDER BY d.criado_em DESC`,
        [req.usuario.id]
      );
    } else {
      // aluno
      resultado = await query(
        `SELECT d.id, d.nome, d.criado_em,
                u.nome AS professor_nome
         FROM disciplinas d
         JOIN disciplina_alunos da ON da.disciplina_id = d.id
         JOIN usuarios u ON u.id = d.professor_id
         WHERE da.aluno_id = $1
         ORDER BY d.criado_em DESC`,
        [req.usuario.id]
      );
    }

    return res.json(resultado.rows);
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  CRIAR disciplina (Professor)
//  Cria disciplina + quadro automaticamente (relação 1:1)
// ============================================================
exports.criar = async (req, res, next) => {
  const client = await getClient();
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { nome } = req.body;

    await client.query('BEGIN');

    // Cria a disciplina
    const disc = await client.query(
      `INSERT INTO disciplinas (nome, professor_id) VALUES ($1, $2) RETURNING *`,
      [nome.trim(), req.usuario.id]
    );
    const disciplina = disc.rows[0];

    // Cria o quadro automaticamente vinculado à disciplina
    const quadro = await client.query(
      `INSERT INTO quadros (titulo, disciplina_id) VALUES ($1, $2) RETURNING *`,
      [`Quadro - ${nome.trim()}`, disciplina.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      ...disciplina,
      quadro: quadro.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ============================================================
//  DETALHAR disciplina
// ============================================================
exports.detalhar = async (req, res, next) => {
  try {
    const { id } = req.params;

    const resultado = await query(
      `SELECT d.*, u.nome AS professor_nome,
              q.id AS quadro_id, q.titulo AS quadro_titulo
       FROM disciplinas d
       JOIN usuarios u ON u.id = d.professor_id
       LEFT JOIN quadros q ON q.disciplina_id = d.id
       WHERE d.id = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Disciplina não encontrada' });
    }

    // Verifica permissão de acesso
    const disc = resultado.rows[0];
    if (req.usuario.papel === 'professor' && disc.professor_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Acesso negado a esta disciplina' });
    }

    return res.json(disc);
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  EDITAR disciplina (só o professor dono)
// ============================================================
exports.editar = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { id }   = req.params;
    const { nome } = req.body;

    const resultado = await query(
      `UPDATE disciplinas SET nome = $1
       WHERE id = $2 AND professor_id = $3
       RETURNING *`,
      [nome.trim(), id, req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Disciplina não encontrada ou sem permissão' });
    }

    return res.json(resultado.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  EXCLUIR disciplina (só o professor dono)
//  Cascade apaga quadro e atividades automaticamente
// ============================================================
exports.excluir = async (req, res, next) => {
  try {
    const { id } = req.params;

    const resultado = await query(
      `DELETE FROM disciplinas WHERE id = $1 AND professor_id = $2 RETURNING id`,
      [id, req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Disciplina não encontrada ou sem permissão' });
    }

    return res.json({ mensagem: 'Disciplina excluída com sucesso' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  MATRICULAR ALUNO na disciplina
// ============================================================
exports.matricularAluno = async (req, res, next) => {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    const { id }       = req.params; // disciplina_id
    const { aluno_id } = req.body;

    // Verifica se a disciplina pertence ao professor
    const disc = await query(
      'SELECT id FROM disciplinas WHERE id = $1 AND professor_id = $2',
      [id, req.usuario.id]
    );
    if (disc.rows.length === 0) {
      return res.status(404).json({ erro: 'Disciplina não encontrada ou sem permissão' });
    }

    // Verifica se o aluno existe
    const aluno = await query('SELECT usuario_id FROM alunos WHERE usuario_id = $1', [aluno_id]);
    if (aluno.rows.length === 0) {
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    }

    await query(
      `INSERT INTO disciplina_alunos (disciplina_id, aluno_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, aluno_id]
    );

    return res.json({ mensagem: 'Aluno matriculado com sucesso' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
//  VER QUADRO completo da disciplina com atividades por coluna
// ============================================================
exports.verQuadro = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Busca o quadro
    const quadroRes = await query(
      `SELECT q.id, q.titulo, d.nome AS disciplina_nome
       FROM quadros q
       JOIN disciplinas d ON d.id = q.disciplina_id
       WHERE d.id = $1`,
      [id]
    );

    if (quadroRes.rows.length === 0) {
      return res.status(404).json({ erro: 'Quadro não encontrado' });
    }

    const quadro = quadroRes.rows[0];

    // Busca atividades agrupadas por status
    const atividadesRes = await query(
      `SELECT id, titulo, descricao, prazo, status, criado_em
       FROM atividades
       WHERE quadro_id = $1
       ORDER BY criado_em ASC`,
      [quadro.id]
    );

    // Organiza em colunas do Kanban
    const colunas = {
      a_fazer:      atividadesRes.rows.filter(a => a.status === 'a_fazer'),
      em_andamento: atividadesRes.rows.filter(a => a.status === 'em_andamento'),
      concluido:    atividadesRes.rows.filter(a => a.status === 'concluido'),
    };

    return res.json({ ...quadro, colunas });
  } catch (err) {
    next(err);
  }
};
