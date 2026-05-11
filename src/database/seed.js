// src/database/seed.js
// Popula o banco com dados iniciais para desenvolvimento/teste

require('dotenv').config();
const bcrypt = require('bcrypt');
const { query, pool } = require('./db');

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...');

  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');

  try {
    // --- Professor de teste ---
    const senhaProf = await bcrypt.hash('prof123', rounds);
    const profResult = await query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, 'professor')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['Prof. Maria Silva', 'prof@kanban.dev', senhaProf]
    );

    if (profResult.rows.length > 0) {
      const profId = profResult.rows[0].id;
      await query(
        `INSERT INTO professores (usuario_id, matricula) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [profId, 'PROF-001']
      );
      console.log('✅ Professor criado:', 'prof@kanban.dev / prof123');

      // Disciplina + Quadro de exemplo
      const discResult = await query(
        `INSERT INTO disciplinas (nome, professor_id) VALUES ($1, $2) RETURNING id`,
        ['Engenharia de Software', profId]
      );
      const discId = discResult.rows[0].id;

      const quadroResult = await query(
        `INSERT INTO quadros (titulo, disciplina_id) VALUES ($1, $2) RETURNING id`,
        ['Quadro - Engenharia de Software', discId]
      );
      const quadroId = quadroResult.rows[0].id;

      // Atividades de exemplo em status diferentes
      await query(
        `INSERT INTO atividades (titulo, descricao, prazo, status, quadro_id) VALUES
         ('Diagrama de Classes', 'Elaborar o diagrama UML do sistema', '2025-07-30', 'a_fazer', $1),
         ('Casos de Uso', 'Documentar os casos de uso principais', '2025-07-20', 'em_andamento', $1),
         ('Relatório Final', 'Entregar relatório de análise', '2025-06-30', 'concluido', $1)`,
        [quadroId]
      );
      console.log('✅ Disciplina, quadro e atividades criados.');
    }

    // --- Aluno de teste ---
    const senhaAluno = await bcrypt.hash('aluno123', rounds);
    const alunoResult = await query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, 'aluno')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['João Aluno', 'aluno@kanban.dev', senhaAluno]
    );

    if (alunoResult.rows.length > 0) {
      const alunoId = alunoResult.rows[0].id;
      await query(
        `INSERT INTO alunos (usuario_id, matricula) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [alunoId, 'ALU-001']
      );
      console.log('✅ Aluno criado:', 'aluno@kanban.dev / aluno123');
    }

    console.log('\n🎉 Seed concluído com sucesso!');
  } catch (err) {
    console.error('❌ Erro no seed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
