// src/routes/disciplinas.js
const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const { autenticar, apenasProfessor, professorOuAluno } = require('../middlewares/auth');
const ctrl = require('../controllers/disciplinasController');

const validarDisciplina = [
  body('nome').trim().notEmpty().withMessage('Nome da disciplina obrigatório'),
];

const validarMatricula = [
  body('aluno_id').isUUID().withMessage('ID do aluno inválido'),
];

// --- Rotas de Disciplinas ---
// GET  /api/disciplinas        → lista (professor vê as suas; aluno vê as que está matriculado)
router.get('/',    autenticar, professorOuAluno, ctrl.listar);

// POST /api/disciplinas        → cria disciplina (só professor)
router.post('/',   autenticar, apenasProfessor, validarDisciplina, ctrl.criar);

// GET  /api/disciplinas/:id    → detalhe de uma disciplina
router.get('/:id', autenticar, professorOuAluno, ctrl.detalhar);

// PUT  /api/disciplinas/:id    → edita disciplina (só professor dono)
router.put('/:id', autenticar, apenasProfessor, validarDisciplina, ctrl.editar);

// DELETE /api/disciplinas/:id  → exclui disciplina (só professor dono)
router.delete('/:id', autenticar, apenasProfessor, ctrl.excluir);

// POST /api/disciplinas/:id/matricular  → matricula aluno na disciplina
router.post('/:id/matricular', autenticar, apenasProfessor, validarMatricula, ctrl.matricularAluno);

// GET  /api/disciplinas/:id/quadro      → retorna quadro + atividades da disciplina
router.get('/:id/quadro', autenticar, professorOuAluno, ctrl.verQuadro);

module.exports = router;
