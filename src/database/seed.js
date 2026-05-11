// src/database/seed.js
// Popula o banco JSON com dados iniciais para desenvolvimento/teste

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { readDB, writeDB, randomUUID } = require('./db');

async function seed() {
  console.log('🌱 Iniciando seed do banco JSON...');
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
  const db = readDB();

  // Evita duplicar se já existirem dados
  if (db.usuarios.find(u => u.email === 'prof@kanban.dev')) {
    console.log('ℹ️  Dados de seed já existem. Pulando...');
    return;
  }

  // --- Professor de teste ---
  const senhaProf = await bcrypt.hash('prof123', rounds);
  const profId = randomUUID();
  db.usuarios.push({ id: profId, nome: 'Prof. Maria Silva', email: 'prof@kanban.dev', senha_hash: senhaProf, papel: 'professor', criado_em: new Date().toISOString() });
  db.professores.push({ usuario_id: profId, matricula: 'PROF-001' });
  console.log('✅ Professor criado: prof@kanban.dev / prof123');

  // Disciplina + Quadro de exemplo
  const discId   = randomUUID();
  const quadroId = randomUUID();
  db.disciplinas.push({ id: discId, nome: 'Engenharia de Software', professor_id: profId, criado_em: new Date().toISOString() });
  db.quadros.push({ id: quadroId, titulo: 'Quadro - Engenharia de Software', disciplina_id: discId });

  // Atividades de exemplo
  db.atividades.push(
    { id: randomUUID(), titulo: 'Diagrama de Classes', descricao: 'Elaborar o diagrama UML do sistema', prazo: '2025-07-30', status: 'a_fazer',      quadro_id: quadroId, criado_em: new Date().toISOString() },
    { id: randomUUID(), titulo: 'Casos de Uso',        descricao: 'Documentar os casos de uso',         prazo: '2025-07-20', status: 'em_andamento', quadro_id: quadroId, criado_em: new Date().toISOString() },
    { id: randomUUID(), titulo: 'Relatório Final',     descricao: 'Entregar relatório de análise',      prazo: '2025-06-30', status: 'concluido',    quadro_id: quadroId, criado_em: new Date().toISOString() }
  );
  console.log('✅ Disciplina, quadro e atividades criados.');

  // --- Aluno de teste ---
  const senhaAluno = await bcrypt.hash('aluno123', rounds);
  const alunoId = randomUUID();
  db.usuarios.push({ id: alunoId, nome: 'João Aluno', email: 'aluno@kanban.dev', senha_hash: senhaAluno, papel: 'aluno', criado_em: new Date().toISOString() });
  db.alunos.push({ usuario_id: alunoId, matricula: 'ALU-001' });
  db.disciplina_alunos.push({ disciplina_id: discId, aluno_id: alunoId });
  console.log('✅ Aluno criado: aluno@kanban.dev / aluno123');

  writeDB(db);
  console.log('\n🎉 Seed concluído com sucesso!');
}

seed().catch(err => console.error('❌ Erro no seed:', err.message));
