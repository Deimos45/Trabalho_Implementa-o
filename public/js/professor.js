// public/js/professor.js

// Protege a rota — só professor acessa
const usuario = exigirAuth('professor');
if (usuario) {
  document.getElementById('user-nome').textContent  = usuario.nome;
  document.getElementById('user-avatar').textContent = usuario.nome.charAt(0).toUpperCase();
}

// Estado global da página
let disciplinas    = [];
let quadroAtual    = null; // { id, disciplina_id, colunas }
let atividadeEdit  = null; // null = criar, objeto = editar

// ============================================================
//  CARREGAR DISCIPLINAS
// ============================================================
async function carregarDisciplinas() {
  const grid = document.getElementById('disciplinas-grid');
  grid.innerHTML = '<div class="loading-state">Carregando disciplinas...</div>';

  try {
    disciplinas = await Disciplinas.listar();
    renderDisciplinas();
  } catch (err) {
    mostrarErro(err.message);
  }
}

function renderDisciplinas() {
  const grid = document.getElementById('disciplinas-grid');

  if (disciplinas.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma disciplina ainda</h3>
        <p>Clique em "+ Nova Disciplina" para criar a primeira.</p>
      </div>`;
    return;
  }

  grid.innerHTML = disciplinas.map((d, i) => `
    <div class="disciplina-card" style="animation-delay:${i * 0.06}s">
      <div class="disc-header">
        <div class="disc-nome">${escHtml(d.nome)}</div>
        <div class="disc-actions">
          <button class="btn-ghost" onclick="abrirModalEditar('${d.id}', '${escHtml(d.nome)}')">✏</button>
          <button class="btn-danger" onclick="excluirDisciplina('${d.id}', '${escHtml(d.nome)}')">✕</button>
        </div>
      </div>
      <div class="disc-stats">
        <div class="stat">
          <span class="stat-val">${d.total_atividades || 0}</span>
          <span class="stat-label">atividades</span>
        </div>
        <div class="stat">
          <span class="stat-val">${d.total_alunos || 0}</span>
          <span class="stat-label">alunos</span>
        </div>
      </div>
      <div class="disc-footer">
        <button class="btn-ver-quadro" onclick="abrirQuadro('${d.id}')">
          ▦ Ver Quadro Kanban
        </button>
      </div>
    </div>
  `).join('');
}

// ============================================================
//  MODAL — CRIAR DISCIPLINA
// ============================================================
function abrirModalDisciplina() {
  document.getElementById('modal-disc-titulo').textContent = 'Nova Disciplina';
  document.getElementById('disc-nome').value = '';
  document.getElementById('disc-id').value   = '';
  document.getElementById('modal-disciplina').classList.remove('hidden');
  document.getElementById('disc-nome').focus();
}

function abrirModalEditar(id, nome) {
  document.getElementById('modal-disc-titulo').textContent = 'Editar Disciplina';
  document.getElementById('disc-nome').value = nome;
  document.getElementById('disc-id').value   = id;
  document.getElementById('modal-disciplina').classList.remove('hidden');
  document.getElementById('disc-nome').focus();
}

function fecharModalDisciplina() {
  document.getElementById('modal-disciplina').classList.add('hidden');
}

document.getElementById('form-disciplina').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('disc-nome').value.trim();
  const id   = document.getElementById('disc-id').value;
  const btn  = document.getElementById('btn-salvar-disc');

  btn.disabled    = true;
  btn.textContent = 'Salvando...';

  try {
    if (id) {
      await Disciplinas.editar(id, nome);
      mostrarSucesso('Disciplina atualizada!');
    } else {
      await Disciplinas.criar(nome);
      mostrarSucesso('Disciplina criada com sucesso!');
    }
    fecharModalDisciplina();
    await carregarDisciplinas();
  } catch (err) {
    mostrarErro(err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Salvar';
  }
});

// ============================================================
//  EXCLUIR DISCIPLINA
// ============================================================
async function excluirDisciplina(id, nome) {
  if (!confirm(`Excluir a disciplina "${nome}"?\n\nTodas as atividades serão removidas.`)) return;
  try {
    await Disciplinas.excluir(id);
    mostrarSucesso('Disciplina excluída.');
    await carregarDisciplinas();
  } catch (err) {
    mostrarErro(err.message);
  }
}

// ============================================================
//  MODAL — QUADRO KANBAN
// ============================================================
async function abrirQuadro(disciplinaId) {
  document.getElementById('modal-quadro').classList.remove('hidden');
  document.getElementById('modal-quadro-titulo').textContent = 'Carregando quadro...';
  limparKanbanMini();

  try {
    const data = await Disciplinas.verQuadro(disciplinaId);
    quadroAtual = data;

    document.getElementById('modal-quadro-titulo').textContent =
      `Quadro — ${data.disciplina_nome}`;

    renderKanbanMini(data.colunas);
    await carregarAlunosDisponiveis(disciplinaId);
  } catch (err) {
    mostrarErro(err.message);
    fecharModalQuadro();
  }
}

function fecharModalQuadro() {
  document.getElementById('modal-quadro').classList.add('hidden');
  quadroAtual = null;
}

function limparKanbanMini() {
  ['mini-afazer','mini-andamento','mini-concluido'].forEach(id => {
    document.getElementById(id).innerHTML = '';
  });
}

function renderKanbanMini(colunas) {
  renderColunaMini('mini-afazer',    colunas.a_fazer);
  renderColunaMini('mini-andamento', colunas.em_andamento);
  renderColunaMini('mini-concluido', colunas.concluido);
}

function renderColunaMini(containerId, atividades) {
  const el = document.getElementById(containerId);
  if (!atividades || atividades.length === 0) {
    el.innerHTML = '<div class="kanban-empty">Nenhuma atividade</div>';
    return;
  }
  el.innerHTML = atividades.map(a => `
    <div class="kanban-card-mini">
      <div class="card-mini-titulo">${escHtml(a.titulo)}</div>
      ${a.prazo ? `<div class="card-mini-prazo">📅 ${formatarData(a.prazo)}</div>` : ''}
      <div class="card-mini-actions">
        <button class="btn-ghost" onclick="abrirModalEditarAtividade(${JSON.stringify(a).replace(/"/g, '&quot;')})">✏</button>
        <button class="btn-danger" onclick="excluirAtividade('${a.id}')">✕</button>
      </div>
    </div>
  `).join('');
}

// ============================================================
//  MODAL — ATIVIDADE (criar/editar)
// ============================================================
function abrirModalAtividade() {
  if (!quadroAtual) return;
  atividadeEdit = null;
  document.getElementById('modal-atv-titulo').textContent = 'Nova Atividade';
  document.getElementById('atv-id').value        = '';
  document.getElementById('atv-quadro-id').value = quadroAtual.id;
  document.getElementById('atv-titulo').value    = '';
  document.getElementById('atv-descricao').value = '';
  document.getElementById('atv-prazo').value     = '';
  document.getElementById('modal-atividade').classList.remove('hidden');
}

function abrirModalEditarAtividade(atv) {
  atividadeEdit = atv;
  document.getElementById('modal-atv-titulo').textContent = 'Editar Atividade';
  document.getElementById('atv-id').value        = atv.id;
  document.getElementById('atv-quadro-id').value = quadroAtual?.id || '';
  document.getElementById('atv-titulo').value    = atv.titulo;
  document.getElementById('atv-descricao').value = atv.descricao || '';
  document.getElementById('atv-prazo').value     = atv.prazo ? atv.prazo.split('T')[0] : '';
  document.getElementById('modal-atividade').classList.remove('hidden');
}

function fecharModalAtividade() {
  document.getElementById('modal-atividade').classList.add('hidden');
  atividadeEdit = null;
}

document.getElementById('form-atividade').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id        = document.getElementById('atv-id').value;
  const quadro_id = document.getElementById('atv-quadro-id').value;
  const titulo    = document.getElementById('atv-titulo').value.trim();
  const descricao = document.getElementById('atv-descricao').value.trim();
  const prazo     = document.getElementById('atv-prazo').value;

  try {
    if (id) {
      await Atividades.editar(id, { titulo, descricao, prazo: prazo || undefined });
      mostrarSucesso('Atividade atualizada!');
    } else {
      await Atividades.criar({ titulo, descricao, prazo: prazo || undefined, quadro_id });
      mostrarSucesso('Atividade criada!');
    }
    fecharModalAtividade();
    // Recarrega o quadro para refletir a mudança
    if (quadroAtual) await abrirQuadro(quadroAtual.disciplina_id || getDisciplinaAtualId());
    await carregarDisciplinas();
  } catch (err) {
    mostrarErro(err.message);
  }
});

// ============================================================
//  EXCLUIR ATIVIDADE
// ============================================================
async function excluirAtividade(id) {
  if (!confirm('Excluir esta atividade?')) return;
  try {
    await Atividades.excluir(id);
    mostrarSucesso('Atividade removida.');
    if (quadroAtual) {
      const discId = getDisciplinaAtualId();
      if (discId) await abrirQuadro(discId);
    }
    await carregarDisciplinas();
  } catch (err) {
    mostrarErro(err.message);
  }
}

function getDisciplinaAtualId() {
  const titulo = document.getElementById('modal-quadro-titulo').textContent;
  const disc   = disciplinas.find(d => titulo.includes(d.nome));
  return disc ? disc.id : null;
}

// ============================================================
//  CARREGAR ALUNOS DISPONÍVEIS PARA MATRICULA
// ============================================================
async function carregarAlunosDisponiveis(discId) {
  try {
    const alunos = await Disciplinas.listarAlunosDisponiveis(discId);
    const select = document.getElementById('aluno-id-input');
    
    select.innerHTML = '<option value="">Selecione um aluno...</option>';
    alunos.forEach(aluno => {
      const option = document.createElement('option');
      option.value = aluno.usuario_id;
      option.textContent = `${aluno.nome} (${aluno.matricula})`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Erro ao carregar alunos:', err.message);
  }
}

// ============================================================
//  MATRICULAR ALUNO
// ============================================================
async function matricularAluno() {
  if (!quadroAtual) return;
  const alunoId  = document.getElementById('aluno-id-input').value.trim();
  const discId   = getDisciplinaAtualId();

  if (!alunoId) { mostrarErro('Selecione um aluno'); return; }
  if (!discId)  { mostrarErro('Disciplina não identificada'); return; }

  try {
    await Disciplinas.matricular(discId, alunoId);
    mostrarSucesso('Aluno matriculado com sucesso!');
    document.getElementById('aluno-id-input').value = '';
    await carregarAlunosDisponiveis(discId);
    await carregarDisciplinas();
  } catch (err) {
    mostrarErro(err.message);
  }
}

// ============================================================
//  HELPERS DE UI
// ============================================================
function mostrarErro(msg) {
  const el = document.getElementById('dashboard-erro');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function mostrarSucesso(msg) {
  const el = document.getElementById('dashboard-sucesso');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatarData(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Fecha modais ao clicar no overlay
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
      quadroAtual   = null;
      atividadeEdit = null;
    }
  });
});

// ============================================================
//  INIT
// ============================================================
carregarDisciplinas();
