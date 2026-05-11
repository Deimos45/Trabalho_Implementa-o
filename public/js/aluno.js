// public/js/aluno.js
// Quadro Kanban do Aluno — Drag-and-Drop + atualização de status

// ============================================================
//  AUTH — protege a rota (só aluno)
// ============================================================
const usuario = exigirAuth('aluno');
if (usuario) {
  document.getElementById('user-nome').textContent   = usuario.nome;
  document.getElementById('user-avatar').textContent = usuario.nome.charAt(0).toUpperCase();
}

// ============================================================
//  ESTADO GLOBAL
// ============================================================
let disciplinas    = [];
let quadroAtual    = null;   // dados do quadro + colunas
let cardArrastando = null;   // { id, statusOrigem }

// ============================================================
//  INICIALIZAÇÃO — carrega disciplinas do aluno
// ============================================================
async function init() {
  try {
    disciplinas = await Disciplinas.listar();

    const sel = document.getElementById('sel-disciplina');

    if (disciplinas.length === 0) {
      sel.innerHTML = '<option value="">Nenhuma disciplina</option>';
      document.getElementById('kanban-board').classList.add('hidden');
      document.getElementById('sem-disciplinas').classList.remove('hidden');
      return;
    }

    sel.innerHTML = disciplinas.map(d =>
      `<option value="${d.id}">${escHtml(d.nome)}</option>`
    ).join('');

    // Carrega o quadro da primeira disciplina
    await carregarQuadro(disciplinas[0].id);

  } catch (err) {
    mostrarErro(err.message);
  }
}

// ============================================================
//  TROCAR DISCIPLINA (select)
// ============================================================
async function trocarDisciplina() {
  const id = document.getElementById('sel-disciplina').value;
  if (id) await carregarQuadro(id);
}

// ============================================================
//  CARREGAR QUADRO
// ============================================================
async function carregarQuadro(disciplinaId) {
  // Mostra loading em todas as colunas
  ['a_fazer','em_andamento','concluido'].forEach(s => {
    document.getElementById(`body-${s}`).innerHTML =
      '<div class="loading-state" style="padding:20px;font-size:.8rem">Carregando...</div>';
    document.getElementById(`count-${s}`).textContent = '0';
  });

  try {
    const data = await Disciplinas.verQuadro(disciplinaId);
    quadroAtual = data;
    renderBoard(data.colunas);
  } catch (err) {
    mostrarErro('Erro ao carregar quadro: ' + err.message);
  }
}

// ============================================================
//  RENDER DO BOARD
// ============================================================
function renderBoard(colunas) {
  renderColuna('a_fazer',      colunas.a_fazer      || []);
  renderColuna('em_andamento', colunas.em_andamento || []);
  renderColuna('concluido',    colunas.concluido     || []);
}

function renderColuna(status, atividades) {
  const body  = document.getElementById(`body-${status}`);
  const count = document.getElementById(`count-${status}`);

  count.textContent = atividades.length;

  if (atividades.length === 0) {
    body.innerHTML = `<div class="kanban-empty-col">Nenhuma atividade aqui</div>`;
    return;
  }

  body.innerHTML = atividades.map((a, i) =>
    criarCardHTML(a, status, i)
  ).join('');

  // Adiciona listeners de drag nos cards recém-criados
  body.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragend',   onDragEnd);
  });
}

// ============================================================
//  HTML DO CARD
// ============================================================
function criarCardHTML(atv, status, index) {
  const prazoFormatado = atv.prazo ? formatarData(atv.prazo) : null;
  const vencido        = atv.prazo && new Date(atv.prazo) < new Date() && status !== 'concluido';
  const badgeClass     = { a_fazer: 'badge-afazer', em_andamento: 'badge-andamento', concluido: 'badge-concluido' }[status];
  const badgeLabel     = { a_fazer: 'A Fazer', em_andamento: 'Em Andamento', concluido: 'Concluído' }[status];

  return `
    <div class="kanban-card"
         draggable="true"
         data-id="${atv.id}"
         data-status="${status}"
         style="animation-delay:${index * 0.05}s"
         onclick="verDetalhe(${JSON.stringify(atv).replace(/"/g, '&quot;')})">
      <div class="card-titulo">${escHtml(atv.titulo)}</div>
      ${atv.descricao
        ? `<div class="card-descricao">${escHtml(atv.descricao.substring(0, 100))}${atv.descricao.length > 100 ? '…' : ''}</div>`
        : ''}
      <div class="card-footer">
        ${prazoFormatado
          ? `<span class="card-prazo ${vencido ? 'vencido' : ''}">
               ${vencido ? '⚠' : '📅'} ${prazoFormatado}
             </span>`
          : '<span></span>'}
        <span class="badge ${badgeClass}">${badgeLabel}</span>
      </div>
    </div>
  `;
}

// ============================================================
//  DRAG AND DROP
// ============================================================
function onDragStart(e) {
  const card = e.currentTarget;
  cardArrastando = {
    id:           card.dataset.id,
    statusOrigem: card.dataset.status,
    elemento:     card,
  };
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', card.dataset.id);
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  // Remove highlight de todas as colunas
  document.querySelectorAll('.col-body').forEach(col => {
    col.classList.remove('drag-over');
  });
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  // Destaca a coluna que está sendo hovereada
  const colBody = e.currentTarget.querySelector('.col-body');
  if (colBody) colBody.classList.add('drag-over');
}

function onDragLeave(e) {
  const colBody = e.currentTarget.querySelector('.col-body');
  if (colBody) colBody.classList.remove('drag-over');
}

async function onDrop(e, statusDestino) {
  e.preventDefault();

  const colBody = e.currentTarget.querySelector('.col-body');
  if (colBody) colBody.classList.remove('drag-over');

  if (!cardArrastando) return;

  const { id, statusOrigem } = cardArrastando;

  // Sem movimento — mesma coluna
  if (statusOrigem === statusDestino) {
    cardArrastando = null;
    return;
  }

  // ── Otimistic UI: move o card visualmente antes da resposta ──
  moverCardVisualmente(id, statusOrigem, statusDestino);

  try {
    // Chama a API (UC_06 — Arrastar card)
    await Atividades.atualizarStatus(id, statusDestino);
    mostrarSucesso(`Card movido para "${labelStatus(statusDestino)}" ✓`);

    // Atualiza os contadores
    atualizarContadores();

  } catch (err) {
    // Reverte o movimento se a API retornar erro (ex: aluno não matriculado)
    moverCardVisualmente(id, statusDestino, statusOrigem);
    mostrarAviso();
    mostrarErro(err.message);
  } finally {
    cardArrastando = null;
  }
}

// ============================================================
//  MOVER CARD VISUALMENTE (sem recarregar tudo)
// ============================================================
function moverCardVisualmente(cardId, de, para) {
  const card = document.querySelector(`.kanban-card[data-id="${cardId}"]`);
  if (!card) return;

  const destBody = document.getElementById(`body-${para}`);

  // Remove "empty" placeholder se existir
  const empty = destBody.querySelector('.kanban-empty-col');
  if (empty) empty.remove();

  // Atualiza o data-status do card
  card.dataset.status = para;

  // Atualiza o badge dentro do card
  const badge      = card.querySelector('.badge');
  const badgeClass = { a_fazer: 'badge-afazer', em_andamento: 'badge-andamento', concluido: 'badge-concluido' }[para];
  const badgeLabel = labelStatus(para);
  if (badge) {
    badge.className  = `badge ${badgeClass}`;
    badge.textContent = badgeLabel;
  }

  // Atualiza classe de prazo vencido
  const prazoEl = card.querySelector('.card-prazo');
  if (prazoEl && para === 'concluido') {
    prazoEl.classList.remove('vencido');
    prazoEl.textContent = prazoEl.textContent.replace('⚠', '📅').trim();
  }

  // Move fisicamente o elemento para a coluna destino
  destBody.appendChild(card);

  // Re-adiciona listeners (necessário após mover o DOM)
  card.removeEventListener('dragstart', onDragStart);
  card.removeEventListener('dragend',   onDragEnd);
  card.addEventListener('dragstart', onDragStart);
  card.addEventListener('dragend',   onDragEnd);

  // Se a coluna origem ficou vazia, mostra placeholder
  const originBody = document.getElementById(`body-${de}`);
  if (originBody && originBody.querySelectorAll('.kanban-card').length === 0) {
    originBody.innerHTML = '<div class="kanban-empty-col">Nenhuma atividade aqui</div>';
  }
}

// ============================================================
//  ATUALIZAR CONTADORES DAS COLUNAS
// ============================================================
function atualizarContadores() {
  ['a_fazer','em_andamento','concluido'].forEach(status => {
    const body  = document.getElementById(`body-${status}`);
    const count = document.getElementById(`count-${status}`);
    const cards = body.querySelectorAll('.kanban-card').length;
    count.textContent = cards;
  });
}

// ============================================================
//  MODAL: VER DETALHES (UC_04)
// ============================================================
function verDetalhe(atv) {
  document.getElementById('detalhe-titulo').textContent = atv.titulo;

  const statusLabel = { a_fazer: 'A Fazer', em_andamento: 'Em Andamento', concluido: 'Concluído' }[atv.status] || atv.status;
  const badgeClass  = { a_fazer: 'badge-afazer', em_andamento: 'badge-andamento', concluido: 'badge-concluido' }[atv.status];

  document.getElementById('detalhe-body').innerHTML = `
    <div class="detalhe-content">
      <div class="detalhe-row">
        <span class="detalhe-label">Status</span>
        <span class="badge ${badgeClass}">${statusLabel}</span>
      </div>
      ${atv.descricao ? `
      <div class="detalhe-row">
        <span class="detalhe-label">Descrição</span>
        <span class="detalhe-val">${escHtml(atv.descricao)}</span>
      </div>` : ''}
      ${atv.prazo ? `
      <div class="detalhe-row">
        <span class="detalhe-label">Prazo</span>
        <span class="detalhe-val">📅 ${formatarData(atv.prazo)}</span>
      </div>` : ''}
      <div class="detalhe-row">
        <span class="detalhe-label">Criado em</span>
        <span class="detalhe-val">${formatarData(atv.criado_em)}</span>
      </div>
      <div class="detalhe-hint">
        💡 Arraste o card no quadro para atualizar o status
      </div>
    </div>
  `;

  document.getElementById('modal-detalhe').classList.remove('hidden');
}

function fecharDetalhe() {
  document.getElementById('modal-detalhe').classList.add('hidden');
}

// Fecha modal ao clicar fora
document.getElementById('modal-detalhe').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) fecharDetalhe();
});

// ============================================================
//  TOAST DE AVISO (coluna inválida — Diagrama Atividade 2)
// ============================================================
function mostrarAviso() {
  const toast = document.getElementById('toast-aviso');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ============================================================
//  HELPERS
// ============================================================
function labelStatus(status) {
  return { a_fazer: 'A Fazer', em_andamento: 'Em Andamento', concluido: 'Concluído' }[status] || status;
}

function mostrarErro(msg) {
  const el = document.getElementById('kanban-erro');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function mostrarSucesso(msg) {
  const el = document.getElementById('kanban-sucesso');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
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

// ============================================================
//  INIT
// ============================================================
init();
