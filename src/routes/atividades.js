// src/routes/atividades.js
const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const { autenticar, apenasProfessor, apenasAluno } = require('../middlewares/auth');
const ctrl = require('../controllers/atividadesController');

const validarAtividade = [
  body('titulo').trim().notEmpty().withMessage('Título obrigatório'),
  body('descricao').optional().trim(),
  body('prazo').optional().isDate().withMessage('Prazo deve ser uma data válida (YYYY-MM-DD)'),
  body('quadro_id').isUUID().withMessage('ID do quadro inválido'),
];

const validarStatus = [
  body('status')
    .isIn(['a_fazer', 'em_andamento', 'concluido'])
    .withMessage('Status inválido. Use: a_fazer, em_andamento ou concluido'),
];

// POST /api/atividades            → cadastrar atividade (UC_02 - só professor)
router.post('/',     autenticar, apenasProfessor, validarAtividade, ctrl.criar);

// GET  /api/atividades/:id        → ver detalhes de uma atividade (UC_04)
router.get('/:id',   autenticar, ctrl.detalhar);

// PUT  /api/atividades/:id        → editar atividade (UC_03 - só professor)
router.put('/:id',   autenticar, apenasProfessor, ctrl.editar);

// DELETE /api/atividades/:id      → excluir atividade (UC_05 - só professor)
router.delete('/:id', autenticar, apenasProfessor, ctrl.excluir);

// PATCH /api/atividades/:id/status → mover card no Kanban (UC_06 - só aluno)
router.patch('/:id/status', autenticar, apenasAluno, validarStatus, ctrl.atualizarStatus);

module.exports = router;
