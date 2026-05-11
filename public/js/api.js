// public/js/api.js
// Módulo central para todas as chamadas à API

const API_BASE = '/api';

// ============================================================
//  AUTH HELPERS
// ============================================================
function getToken()  { return localStorage.getItem('token'); }
function getUsuario(){ return JSON.parse(localStorage.getItem('usuario') || 'null'); }

function salvarSessao(data) {
  localStorage.setItem('token',   data.token);
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
}

function limparSessao() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
}

function logout() {
  limparSessao();
  window.location.href = '/index.html';
}

// Redireciona para login se não autenticado
function exigirAuth(papel = null) {
  const token   = getToken();
  const usuario = getUsuario();
  if (!token || !usuario) {
    window.location.href = '/index.html';
    return null;
  }
  if (papel && usuario.papel !== papel) {
    window.location.href = usuario.papel === 'professor'
      ? '/professor.html'
      : '/aluno.html';
    return null;
  }
  return usuario;
}

// ============================================================
//  FETCH WRAPPER
// ============================================================
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data.erro
      || (data.erros && data.erros.map(e => e.msg).join(', '))
      || `Erro ${response.status}`;
    throw new Error(msg);
  }

  return data;
}

// ============================================================
//  API — AUTH
// ============================================================
const Auth = {
  login:    (email, senha)               => apiFetch('/auth/login',    { method: 'POST', body: { email, senha } }),
  register: (nome, email, senha, papel, matricula) =>
    apiFetch('/auth/register', { method: 'POST', body: { nome, email, senha, papel, matricula } }),
  me:       ()                           => apiFetch('/auth/me'),
};

// ============================================================
//  API — DISCIPLINAS
// ============================================================
const Disciplinas = {
  listar:    ()          => apiFetch('/disciplinas'),
  criar:     (nome)      => apiFetch('/disciplinas',         { method: 'POST', body: { nome } }),
  editar:    (id, nome)  => apiFetch(`/disciplinas/${id}`,   { method: 'PUT',  body: { nome } }),
  excluir:   (id)        => apiFetch(`/disciplinas/${id}`,   { method: 'DELETE' }),
  verQuadro: (id)        => apiFetch(`/disciplinas/${id}/quadro`),
  matricular:(id, aluno_id) => apiFetch(`/disciplinas/${id}/matricular`, { method: 'POST', body: { aluno_id } }),
};

// ============================================================
//  API — ATIVIDADES
// ============================================================
const Atividades = {
  criar:          (dados)        => apiFetch('/atividades',              { method: 'POST',  body: dados }),
  editar:         (id, dados)    => apiFetch(`/atividades/${id}`,        { method: 'PUT',   body: dados }),
  excluir:        (id)           => apiFetch(`/atividades/${id}`,        { method: 'DELETE' }),
  atualizarStatus:(id, status)   => apiFetch(`/atividades/${id}/status`, { method: 'PATCH', body: { status } }),
};
