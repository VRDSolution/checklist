# Check-in System - Backend API

Sistema completo de Check-in/Check-out para técnicos com FastAPI, PostgreSQL e Redis.

## 🚀 Tecnologias

- **Python 3.11+**
- **FastAPI** - Framework web moderno
- **SQLAlchemy 2.0** - ORM
- **PostgreSQL 15** - Banco de dados
- **Redis** - Cache e sessões
- **Alembic** - Migrations
- **JWT** - Autenticação
- **Docker** - Containerização

## 📋 Funcionalidades

- ✅ **Autenticação JWT** com roles (Admin, Supervisor, Técnico)
- ✅ **CRUD completo** de Usuários, Clientes, Projetos e Tarefas
- ✅ **Sistema de Check-in/Check-out** com cronômetro automático
- ✅ **Upload de anexos** com validação de tipos
- ✅ **Auditoria completa** de todas as operações
- ✅ **API documentada** com Swagger/OpenAPI
- ✅ **Pagination** e filtros avançados
- ✅ **Soft delete** para preservação de dados
- ✅ **Docker ready** para produção

## 🛠️ Setup de Desenvolvimento

### 1. Com Docker (Recomendado)

```bash
# Clone o repositório
git clone <repository-url>
cd checklist/backend

# Inicie os serviços
docker-compose up -d

# Execute as migrations
docker-compose exec backend alembic upgrade head

# Execute o seed de dados
docker-compose exec backend python app/scripts/seed.py

# API estará disponível em: http://localhost:8000
```

### 2. Setup Local

```bash
# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env conforme necessário

# Criar banco de dados PostgreSQL
createdb checkinsys_db

# Executar migrations
alembic upgrade head

# Executar seed de dados
python app/scripts/seed.py

# Iniciar servidor de desenvolvimento
uvicorn app.main:app --reload --port 8000
```

## 🗄️ Banco de Dados

### Migrations

```bash
# Criar nova migration
alembic revision --autogenerate -m "Descrição da migration"

# Aplicar migrations
alembic upgrade head

# Reverter migration
alembic downgrade -1
```

### Seed Data

O script de seed cria:

- **Usuários padrão** com diferentes roles
- **Categorias de tarefas** (Configuração, Manutenção, etc.)
- **Tarefas** pré-cadastradas por categoria
- **Clientes** de exemplo
- **Projetos** de teste


## 📚 API Documentation

Acesse a documentação interativa:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## 🔐 Autenticação

### Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "arthur@vrdsolution.com",
  "senha": "Arthur@123"
}
```

### Uso do Token

```bash
Authorization: Bearer <jwt_token>
```

## 📊 Endpoints Principais

### 🔐 Auth
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Info do usuário logado
- `POST /api/v1/auth/logout` - Logout

### ⏱️ Check-ins (CORE)
- `POST /api/v1/checkins/start` - Iniciar check-in
- `POST /api/v1/checkins/{id}/end` - Finalizar check-in
- `GET /api/v1/checkins` - Listar check-ins
- `GET /api/v1/checkins/active` - Check-in ativo do usuário
- `GET /api/v1/checkins/{id}` - Detalhes do check-in

### 👥 Usuários
- `GET /api/v1/users` - Listar usuários
- `POST /api/v1/users` - Criar usuário (admin only)
- `GET /api/v1/users/{id}` - Detalhes do usuário
- `PUT /api/v1/users/{id}` - Atualizar usuário
- `DELETE /api/v1/users/{id}` - Deletar usuário (soft)

### 🏢 Clientes
- `GET /api/v1/clients` - Listar clientes
- `POST /api/v1/clients` - Criar cliente
- `GET /api/v1/clients/{id}` - Detalhes do cliente
- `PUT /api/v1/clients/{id}` - Atualizar cliente

### 📁 Projetos
- `GET /api/v1/projects` - Listar projetos
- `POST /api/v1/projects` - Criar projeto
- `GET /api/v1/projects/{id}` - Detalhes do projeto
- `PUT /api/v1/projects/{id}` - Atualizar projeto

### ✅ Tarefas
- `GET /api/v1/tasks` - Listar tarefas
- `POST /api/v1/tasks` - Criar tarefa
- `GET /api/v1/task-categories` - Listar categorias

## 🔄 Fluxo de Check-in

### 1. Iniciar Check-in

```json
POST /api/v1/checkins/start
{
  "projeto_id": 1,
  "localizacao_inicio": "Cliente ABC - Sala de máquinas"
}
```

### 2. Finalizar Check-in

```json
POST /api/v1/checkins/1/end
{
  "tarefas_executadas": [
    {
      "tarefa_id": 1,
      "observacao_tarefa": "Configuração realizada com sucesso"
    },
    {
      "tarefa_id": 3,
      "observacao_tarefa": "Limpeza completa dos equipamentos"
    }
  ],
  "observacoes": "Cliente satisfeito com o atendimento",
  "localizacao_fim": "Cliente ABC - Concluído"
}
```

### 3. Resultado

O sistema calcula automaticamente:
- ⏰ **Duração** em minutos e formato HH:MM
- 📅 **Data/hora fim** do check-out
- 📊 **Status** atualizado para "concluido"

## 🛡️ Segurança

### Roles e Permissões

| Role | Permissões |
|------|------------|
| **Admin** | Acesso total, gerenciar usuários, ver todos os projetos |
| **Supervisor** | Ver todos os projetos, editar projetos, relatórios |
| **Técnico** | Ver próprios checkins, projetos alocados, fazer check-in/out |

### Validações

- ✅ **Email único** e formato válido
- ✅ **CNPJ válido** com algoritmo de validação
- ✅ **Senha forte** com mínimo 6 caracteres
- ✅ **Datas consistentes** (fim >= início)
- ✅ **Tipos de arquivo** validados para anexos
- ✅ **Tamanho máximo** de 10MB para arquivos

## 🧪 Testes

```bash
# Executar todos os testes
pytest

# Testes com cobertura
pytest --cov=app --cov-report=html

# Testes específicos
pytest app/tests/test_auth.py
```

## 📁 Estrutura do Projeto

```
backend/
├─ app/
│  ├─ api/v1/          # Endpoints REST
│  ├─ core/            # Config, security, database
│  ├─ models/          # SQLAlchemy models
│  ├─ schemas/         # Pydantic schemas
│  ├─ services/        # Business logic
│  ├─ scripts/         # Seed e utilitários
│  └─ tests/           # Testes automatizados
├─ alembic/            # Database migrations
├─ uploads/            # Arquivos uploadados
├─ docker-compose.yml  # Orquestração Docker
├─ Dockerfile          # Container da aplicação
└─ requirements.txt    # Dependências Python
```

## 🐛 Troubleshooting

### Problemas Comuns

**1. Erro de conexão com banco:**
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Ver logs do banco
docker-compose logs db
```

**2. Migration com erro:**
```bash
# Resetar migrations (CUIDADO: perde dados!)
alembic downgrade base
alembic upgrade head
```

**3. Permissão negada:**
```bash
# Verificar token JWT
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/auth/me
```

## 🚀 Deploy para Produção

### Variáveis de Ambiente

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=sua-chave-secreta-super-forte-aqui
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=["https://yourfrontend.com"]
```

### Com Docker

```bash
# Build para produção
docker build -t checkinsys-api .

# Run em produção
docker run -p 8000:8000 --env-file .env checkinsys-api
```

## 📞 Suporte

Para dúvidas ou problemas:

1. Verificar a documentação da API em `/docs`
2. Consultar logs: `docker-compose logs backend`
3. Verificar issues no GitHub
4. Contatar equipe de desenvolvimento