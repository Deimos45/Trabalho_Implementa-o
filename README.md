# 📋 Kanban Acadêmico

Sistema de Gestão de Atividades Acadêmicas com quadro Kanban.  
Professores gerenciam disciplinas e atividades; Alunos visualizam e movem cards.

---

## 🗂️ Estrutura de Pastas

```
kanban-academico/
├── database/
│   └── schema.sql          # DDL completo do banco de dados
├── public/                 # Frontend (HTML/CSS/JS) — Partes 4 e 5
│   ├── index.html
│   ├── css/
│   └── js/
├── src/
│   ├── server.js           # Entry point Express
│   ├── database/
│   │   ├── db.js           # Pool de conexão PostgreSQL
│   │   ├── migrate.js      # Runner do schema.sql
│   │   └── seed.js         # Dados iniciais de teste
│   ├── routes/             # Rotas da API (Partes 2 e 3)
│   │   ├── auth.js
│   │   ├── disciplinas.js
│   │   ├── atividades.js
│   │   └── quadros.js
│   ├── controllers/        # Lógica de negócio
│   ├── middlewares/        # Auth JWT, validações
│   └── models/             # Queries SQL por entidade
├── .env.example
├── .gitignore
└── package.json
```

---

## ⚙️ Setup — Passo a Passo

### 1. Pré-requisitos
- Node.js >= 18
- PostgreSQL >= 14

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite o arquivo .env com suas credenciais do PostgreSQL
```

### 4. Criar o banco de dados no PostgreSQL
```sql
CREATE DATABASE kanban_academico;
```

### 5. Executar o schema (criar tabelas)
```bash
npm run db:migrate
```

### 6. Popular com dados de teste
```bash
npm run db:seed
```
Isso cria:
- **Professor**: `prof@kanban.dev` / `prof123`
- **Aluno**: `aluno@kanban.dev` / `aluno123`

### 7. Iniciar o servidor
```bash
# Desenvolvimento (com hot-reload)
npm run dev

# Produção
npm start
```

Acesse: http://localhost:3000

---

## 🗄️ Modelo de Dados (ER resumido)

```
usuarios (base)
  ├── professores (1:1 via usuario_id)
  └── alunos      (1:1 via usuario_id)

professores ──1:N──> disciplinas
disciplinas ──1:1──> quadros
quadros     ──1:N──> atividades

disciplinas <──N:M──> alunos  (via disciplina_alunos)
```

---

## 🔌 API Endpoints (planejados)

| Método | Rota                              | Descrição                    |
|--------|-----------------------------------|------------------------------|
| POST   | /api/auth/login                   | Login (Prof. ou Aluno)       |
| POST   | /api/auth/register                | Cadastro                     |
| GET    | /api/disciplinas                  | Listar disciplinas           |
| POST   | /api/disciplinas                  | Criar disciplina (Prof.)     |
| GET    | /api/disciplinas/:id/quadro       | Quadro da disciplina         |
| POST   | /api/atividades                   | Cadastrar atividade (Prof.)  |
| PUT    | /api/atividades/:id               | Editar atividade (Prof.)     |
| DELETE | /api/atividades/:id               | Excluir atividade (Prof.)    |
| PATCH  | /api/atividades/:id/status        | Mover card (Aluno)           |
