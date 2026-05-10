-- ============================================================
--  KANBAN ACADÊMICO — Schema PostgreSQL
--  Baseado no Diagrama de Classes fornecido
-- ============================================================

-- Extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- ENUM: Papel do usuário no sistema
-- ------------------------------------------------------------
CREATE TYPE papel_usuario AS ENUM ('professor', 'aluno');

-- ------------------------------------------------------------
-- ENUM: Status possíveis de uma atividade no Kanban
-- ------------------------------------------------------------
CREATE TYPE status_atividade AS ENUM ('a_fazer', 'em_andamento', 'concluido');

-- ============================================================
--  TABELA BASE: usuarios
--  Representa a classe abstrata "Usuario" do diagrama
-- ============================================================
CREATE TABLE usuarios (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(150) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    senha_hash  TEXT        NOT NULL,
    papel       papel_usuario NOT NULL,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  TABELA: professores
--  Herança de "Usuario" → "Professor" (relação 1-to-1)
--  Matrícula e vínculo direto com o usuário base
-- ============================================================
CREATE TABLE professores (
    usuario_id  UUID        PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    matricula   VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================================
--  TABELA: alunos
--  Herança de "Usuario" → "Aluno" (relação 1-to-1)
-- ============================================================
CREATE TABLE alunos (
    usuario_id  UUID        PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    matricula   VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================================
--  TABELA: disciplinas
--  Criada por um Professor (relação 1:N — professor → disciplinas)
-- ============================================================
CREATE TABLE disciplinas (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(200) NOT NULL,
    professor_id    UUID        NOT NULL REFERENCES professores(usuario_id) ON DELETE CASCADE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  TABELA: quadros
--  Relação 1:1 com Disciplina (cada disciplina tem um quadro)
-- ============================================================
CREATE TABLE quadros (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo          VARCHAR(200) NOT NULL,
    disciplina_id   UUID        NOT NULL UNIQUE REFERENCES disciplinas(id) ON DELETE CASCADE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  TABELA: atividades
--  Relação 1:N com Quadro (quadro → muitas atividades)
--  Representa os "cards" do Kanban
-- ============================================================
CREATE TABLE atividades (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo      VARCHAR(300)    NOT NULL,
    descricao   TEXT,
    prazo       DATE,
    status      status_atividade NOT NULL DEFAULT 'a_fazer',
    quadro_id   UUID            NOT NULL REFERENCES quadros(id) ON DELETE CASCADE,
    criado_em   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
--  TABELA ASSOCIATIVA: disciplina_alunos
--  Alunos matriculados em disciplinas (N:M)
-- ============================================================
CREATE TABLE disciplina_alunos (
    disciplina_id   UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    aluno_id        UUID NOT NULL REFERENCES alunos(usuario_id) ON DELETE CASCADE,
    matriculado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (disciplina_id, aluno_id)
);

-- ============================================================
--  FUNÇÃO + TRIGGER: atualiza "atualizado_em" automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_ts
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trg_disciplinas_ts
    BEFORE UPDATE ON disciplinas
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trg_quadros_ts
    BEFORE UPDATE ON quadros
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trg_atividades_ts
    BEFORE UPDATE ON atividades
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- ============================================================
--  ÍNDICES para performance
-- ============================================================
CREATE INDEX idx_disciplinas_professor ON disciplinas(professor_id);
CREATE INDEX idx_atividades_quadro     ON atividades(quadro_id);
CREATE INDEX idx_atividades_status     ON atividades(status);
CREATE INDEX idx_disciplina_alunos_aluno ON disciplina_alunos(aluno_id);

-- ============================================================
--  VIEW: visão consolidada do quadro com atividades
-- ============================================================
CREATE VIEW vw_quadro_atividades AS
SELECT
    q.id           AS quadro_id,
    q.titulo       AS quadro_titulo,
    d.id           AS disciplina_id,
    d.nome         AS disciplina_nome,
    d.professor_id,
    a.id           AS atividade_id,
    a.titulo       AS atividade_titulo,
    a.descricao,
    a.prazo,
    a.status,
    a.criado_em    AS atividade_criada_em
FROM quadros q
JOIN disciplinas d ON d.id = q.disciplina_id
LEFT JOIN atividades a ON a.quadro_id = q.id;

-- ============================================================
--  SEED INICIAL: usuário admin professor (senha: admin123)
--  hash gerado via bcrypt rounds=10
-- ============================================================
-- (Execute após o setup do projeto para teste)
-- INSERT INTO usuarios (nome, email, senha_hash, papel)
-- VALUES ('Admin Professor', 'prof@kanban.dev',
--         '$2b$10$PLACEHOLDER_HASH', 'professor')
-- RETURNING id;
