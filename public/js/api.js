// public/js/api.js
// ============================================================
//  KANBAN ACADÊMICO — Camada de dados via localStorage
//  Substitui todas as chamadas ao backend Node/Express
// ============================================================

// ============================================================
//  UTILS
// ============================================================
function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function hashSenha(senha) {
  // Simulação simples de hash para localStorage (não use em produção real)
  // Usamos btoa + prefixo para dificultar leitura direta
  return 'hash:' + btoa(encodeURIComponent(senha));
}

async function verificarSenha(senha, hash) {
  return hash === 'hash:' + btoa(encodeURIComponent(senha));
}

// ============================================================
//  BANCO DE DADOS (localStorage)
// ============================================================
const DB_KEY = 'kanban_academico_db';
let _dbInitialized = false;

function readDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return initDB();
    return JSON.parse(raw);
  } catch {
    return initDB();
  }
}

function writeDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function initDB() {
  // Se já foi inicializado, não faz seed novamente
  if (_dbInitialized) {
    return readDB();
  }
  
  _dbInitialized = true;
  
  const db = {
    usuarios: [],
    professores: [],
    alunos: [],
    disciplinas: [],
    quadros: [],
    atividades: [],
    disciplina_alunos: [],
  };
  
  // Seed de dados iniciais
  seedDB(db);
  writeDB(db);
  return db;
}

function seedDB(db) {
  // Criar usuários de demo
  const prof = {
    id: 'prof-demo-001',
    nome: 'João Professor',
    email: 'professor@demo.local',
    senha_hash: 'hash:' + btoa(encodeURIComponent('123456')),
    papel: 'professor',
    criado_em: new Date().toISOString(),
  };
  
  const alunos_dados = [
    { nome: 'Maria Silva', email: 'maria@demo.local', senha: '123456' },
    { nome: 'Pedro Santos', email: 'pedro@demo.local', senha: '123456' },
    { nome: 'Ana Costa', email: 'ana@demo.local', senha: '123456' },
    { nome: 'Carlos Oliveira', email: 'carlos@demo.local', senha: '123456' },
    { nome: 'Julia Ferreira', email: 'julia@demo.local', senha: '123456' },
  ];
  
  db.usuarios.push(prof);
  db.professores.push({ usuario_id: prof.id, matricula: 'PROF001' });
  
  alunos_dados.forEach((aluno_data, idx) => {
    const aluno_user = {
      id: `aluno-demo-${String(idx + 1).padStart(3, '0')}`,
      nome: aluno_data.nome,
      email: aluno_data.email,
      senha_hash: 'hash:' + btoa(encodeURIComponent(aluno_data.senha)),
      papel: 'aluno',
      criado_em: new Date().toISOString(),
    };
    db.usuarios.push(aluno_user);
    db.alunos.push({ 
      usuario_id: aluno_user.id, 
      matricula: `MAT${String(idx + 1).padStart(3, '0')}` 
    });
  });
}

// ============================================================
//  AUTH HELPERS (sessão)
// ============================================================
function getToken()   { return localStorage.getItem('token'); }
function getUsuario() { return JSON.parse(localStorage.getItem('usuario') || 'null'); }

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
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 100);
}

function entrarSemLogin(papel) {
  const usuario = {
    id:        randomUUID(),
    nome:      papel === 'professor' ? 'Professor Demo' : 'Aluno Demo',
    email:     papel === 'professor' ? 'prof@demo.local' : 'aluno@demo.local',
    papel:     papel,
    matricula: randomUUID(),
  };

  const token = gerarToken(usuario);
  salvarSessao({ token, usuario });
}

// Token simples: base64 do payload (apenas para identificar a sessão localmente)
function gerarToken(usuario) {
  const payload = { id: usuario.id, email: usuario.email, papel: usuario.papel, nome: usuario.nome };
  return 'local.' + btoa(JSON.stringify(payload));
}

function decodificarToken(token) {
  try {
    if (!token || !token.startsWith('local.')) return null;
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
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
    window.location.href = usuario.papel === 'professor' ? '/professor.html' : '/aluno.html';
    return null;
  }
  return usuario;
}

// ============================================================
//  API — AUTH
// ============================================================
const Auth = {
  login: async (email, senha) => {
    const db = readDB();
    const usuario = db.usuarios.find(u => u.email === email.toLowerCase().trim());
    if (!usuario) throw new Error('Credenciais inválidas');

    const senhaCorreta = await verificarSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) throw new Error('Credenciais inválidas');

    let perfil = {};
    if (usuario.papel === 'professor') perfil = db.professores.find(p => p.usuario_id === usuario.id) || {};
    if (usuario.papel === 'aluno')     perfil = db.alunos.find(a => a.usuario_id === usuario.id) || {};

    const token = gerarToken(usuario);
    return {
      token,
      usuario: {
        id:        usuario.id,
        nome:      usuario.nome,
        email:     usuario.email,
        papel:     usuario.papel,
        matricula: perfil.matricula,
      },
    };
  },

  register: async (nome, email, senha, papel, matricula) => {
    const db = readDB();

    if (db.usuarios.find(u => u.email === email.toLowerCase().trim())) {
      throw new Error('E-mail já cadastrado');
    }

    const tabelaPerfil = papel === 'professor' ? db.professores : db.alunos;
    if (tabelaPerfil.find(p => p.matricula === matricula.trim())) {
      throw new Error('Matrícula já cadastrada');
    }

    const senhaHash = await hashSenha(senha);
    const usuario = {
      id:         randomUUID(),
      nome:       nome.trim(),
      email:      email.toLowerCase().trim(),
      senha_hash: senhaHash,
      papel,
      criado_em:  new Date().toISOString(),
    };
    db.usuarios.push(usuario);

    const perfil = { usuario_id: usuario.id, matricula: matricula.trim() };
    if (papel === 'professor') db.professores.push(perfil);
    else                       db.alunos.push(perfil);

    writeDB(db);

    const token = gerarToken(usuario);
    return {
      token,
      usuario: {
        id:        usuario.id,
        nome:      usuario.nome,
        email:     usuario.email,
        papel:     usuario.papel,
        matricula: matricula.trim(),
      },
    };
  },

  me: async () => {
    const usuario = getUsuario();
    if (!usuario) throw new Error('Não autenticado');
    return usuario;
  },
};

// ============================================================
//  API — DISCIPLINAS
// ============================================================
const Disciplinas = {
  listar: async () => {
    const usuario = getUsuario();
    const db = readDB();

    if (usuario.papel === 'professor') {
      return db.disciplinas
        .filter(d => d.professor_id === usuario.id)
        .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
        .map(d => {
          const quadrosIds       = db.quadros.filter(q => q.disciplina_id === d.id).map(q => q.id);
          const total_alunos     = db.disciplina_alunos.filter(da => da.disciplina_id === d.id).length;
          const total_atividades = db.atividades.filter(a => quadrosIds.includes(a.quadro_id)).length;
          return { ...d, total_alunos, total_atividades };
        });
    }

    // Aluno — apenas as que está matriculado
    const matriculas = db.disciplina_alunos.filter(da => da.aluno_id === usuario.id);
    return matriculas
      .map(da => {
        const disc      = db.disciplinas.find(d => d.id === da.disciplina_id);
        if (!disc) return null;
        const professor = db.usuarios.find(u => u.id === disc.professor_id);
        return { ...disc, professor_nome: professor?.nome };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
  },

  criar: async (nome) => {
    const usuario = getUsuario();
    const db = readDB();

    const disciplina = {
      id:           randomUUID(),
      nome:         nome.trim(),
      professor_id: usuario.id,
      criado_em:    new Date().toISOString(),
    };
    db.disciplinas.push(disciplina);

    const quadro = {
      id:            randomUUID(),
      titulo:        `Quadro - ${nome.trim()}`,
      disciplina_id: disciplina.id,
    };
    db.quadros.push(quadro);

    writeDB(db);
    return { ...disciplina, quadro };
  },

  editar: async (id, nome) => {
    const usuario = getUsuario();
    const db = readDB();

    const idx = db.disciplinas.findIndex(d => d.id === id && d.professor_id === usuario.id);
    if (idx === -1) throw new Error('Disciplina não encontrada ou sem permissão');

    db.disciplinas[idx].nome = nome.trim();
    writeDB(db);
    return db.disciplinas[idx];
  },

  excluir: async (id) => {
    const usuario = getUsuario();
    const db = readDB();

    const idx = db.disciplinas.findIndex(d => d.id === id && d.professor_id === usuario.id);
    if (idx === -1) throw new Error('Disciplina não encontrada ou sem permissão');

    const quadrosIds = db.quadros.filter(q => q.disciplina_id === id).map(q => q.id);
    db.atividades        = db.atividades.filter(a => !quadrosIds.includes(a.quadro_id));
    db.quadros           = db.quadros.filter(q => q.disciplina_id !== id);
    db.disciplina_alunos = db.disciplina_alunos.filter(da => da.disciplina_id !== id);
    db.disciplinas.splice(idx, 1);

    writeDB(db);
    return { mensagem: 'Disciplina excluída com sucesso' };
  },

  verQuadro: async (id) => {
    const db = readDB();

    const disciplina = db.disciplinas.find(d => d.id === id);
    const quadro     = db.quadros.find(q => q.disciplina_id === id);
    if (!quadro || !disciplina) throw new Error('Quadro não encontrado');

    const atividades = db.atividades
      .filter(a => a.quadro_id === quadro.id)
      .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));

    return {
      id:              quadro.id,
      titulo:          quadro.titulo,
      disciplina_id:   disciplina.id,
      disciplina_nome: disciplina.nome,
      colunas: {
        a_fazer:      atividades.filter(a => a.status === 'a_fazer'),
        em_andamento: atividades.filter(a => a.status === 'em_andamento'),
        concluido:    atividades.filter(a => a.status === 'concluido'),
      },
    };
  },

  matricular: async (id, aluno_id) => {
    const usuario = getUsuario();
    const db = readDB();

    const disciplina = db.disciplinas.find(d => d.id === id && d.professor_id === usuario.id);
    if (!disciplina) throw new Error('Disciplina não encontrada ou sem permissão');

    const aluno = db.alunos.find(a => a.usuario_id === aluno_id);
    if (!aluno) throw new Error('Aluno não encontrado');

    const jaMatriculado = db.disciplina_alunos.find(da => da.disciplina_id === id && da.aluno_id === aluno_id);
    if (!jaMatriculado) {
      db.disciplina_alunos.push({ disciplina_id: id, aluno_id });
      writeDB(db);
    }

    return { mensagem: 'Aluno matriculado com sucesso' };
  },

  listarAlunosDisponiveis: async (discId) => {
    const db = readDB();
    
    // Pega todos os alunos com seus dados de usuário
    const todos = db.alunos
      .map(a => {
        const usuario = db.usuarios.find(u => u.id === a.usuario_id);
        if (!usuario) return null;
        return { 
          usuario_id: a.usuario_id, 
          nome: usuario.nome || 'Sem nome', 
          matricula: a.matricula || 'Sem matrícula' 
        };
      })
      .filter(a => a !== null);
    
    // Filtra alunos não matriculados nessa disciplina
    const matriculados = db.disciplina_alunos
      .filter(da => da.disciplina_id === discId)
      .map(da => da.aluno_id);
    
    return todos.filter(a => !matriculados.includes(a.usuario_id));
  },
};

// ============================================================
//  API — ATIVIDADES
// ============================================================
const Atividades = {
  criar: async ({ titulo, descricao, prazo, quadro_id }) => {
    const usuario = getUsuario();
    const db = readDB();

    const quadro     = db.quadros.find(q => q.id === quadro_id);
    const disciplina = quadro && db.disciplinas.find(d => d.id === quadro.disciplina_id && d.professor_id === usuario.id);
    if (!disciplina) throw new Error('Quadro não encontrado ou sem permissão');

    const atividade = {
      id:        randomUUID(),
      titulo:    titulo.trim(),
      descricao: descricao?.trim() || null,
      prazo:     prazo || null,
      status:    'a_fazer',
      quadro_id,
      criado_em: new Date().toISOString(),
    };
    db.atividades.push(atividade);
    writeDB(db);

    return atividade;
  },

  editar: async (id, { titulo, descricao, prazo }) => {
    const usuario = getUsuario();
    const db = readDB();

    const idx = db.atividades.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Atividade não encontrada ou sem permissão');

    const quadro     = db.quadros.find(q => q.id === db.atividades[idx].quadro_id);
    const disciplina = db.disciplinas.find(d => d.id === quadro?.disciplina_id && d.professor_id === usuario.id);
    if (!disciplina) throw new Error('Atividade não encontrada ou sem permissão');

    if (titulo)              db.atividades[idx].titulo    = titulo.trim();
    if (descricao)           db.atividades[idx].descricao = descricao.trim();
    if (prazo !== undefined) db.atividades[idx].prazo     = prazo || null;

    writeDB(db);
    return db.atividades[idx];
  },

  excluir: async (id) => {
    const usuario = getUsuario();
    const db = readDB();

    const idx = db.atividades.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Atividade não encontrada ou sem permissão');

    const quadro     = db.quadros.find(q => q.id === db.atividades[idx].quadro_id);
    const disciplina = db.disciplinas.find(d => d.id === quadro?.disciplina_id && d.professor_id === usuario.id);
    if (!disciplina) throw new Error('Sem permissão para excluir esta atividade');

    db.atividades.splice(idx, 1);
    writeDB(db);

    return { mensagem: 'Atividade removida com sucesso' };
  },

  atualizarStatus: async (id, status) => {
    const usuario = getUsuario();
    const db = readDB();

    const statusValidos = ['a_fazer', 'em_andamento', 'concluido'];
    if (!statusValidos.includes(status)) throw new Error('Status inválido');

    const idx = db.atividades.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Atividade não encontrada');

    const quadro     = db.quadros.find(q => q.id === db.atividades[idx].quadro_id);
    const disciplina = db.disciplinas.find(d => d.id === quadro?.disciplina_id);

    const matriculado = disciplina && db.disciplina_alunos.find(
      da => da.disciplina_id === disciplina.id && da.aluno_id === usuario.id
    );
    if (!matriculado) throw new Error('Acesso negado. Você não está matriculado nesta disciplina.');

    db.atividades[idx].status = status;
    writeDB(db);

    return { mensagem: 'Status atualizado com sucesso', atividade: db.atividades[idx] };
  },
};