// src/routes/auth.js
const express    = require('express');
const router     = express.Router();
const { body }   = require('express-validator');
const authController = require('../controllers/authController');

// --- Validações reutilizáveis ---
const loginValidations = [
  body('email').isEmail().withMessage('E-mail inválido'),
  body('senha').notEmpty().withMessage('Senha obrigatória'),
];

const registerValidations = [
  body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
  body('email').isEmail().withMessage('E-mail inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
  body('papel').isIn(['professor', 'aluno']).withMessage('Papel deve ser professor ou aluno'),
  body('matricula').trim().notEmpty().withMessage('Matrícula obrigatória'),
];

// POST /api/auth/login
router.post('/login', loginValidations, authController.login);

// POST /api/auth/register
router.post('/register', registerValidations, authController.register);

// GET /api/auth/me  (retorna dados do usuário logado)
router.get('/me', require('../middlewares/auth'), authController.me);

module.exports = router;
