# ⚙️ Backend - Sistema de Check-in API

O backend é uma API RESTful robusta desenvolvida com **FastAPI (Python)**, **SQLAlchemy** e **MySQL**.

## 📂 Estrutura de Pastas e Módulos

A lógica da aplicação reside na pasta `app/`. Aqui estão os principais módulos para manutenção:

- **`app/api/v1/`**: Endpoints (Rotas) da API. Organizados por recursos (auth, users, projects).
- **`app/models/`**: Modelos do Banco de Dados (Classes SQLAlchemy). Define as tabelas.
- **`app/schemas/`**: Schemas Pydantic. Define a validação de entrada/saída (DTOs).
- **`app/services/`**: Regras de Negócio. A lógica pesada deve ficar aqui, não nas rotas.
- **`app/core/`**: Configurações globais (`config.py`), segurança (`security.py`) e conexão DB.
- **`app/alembic/` (ou `api/alembic`)**: Scripts de migração de banco de dados.

---

## 💻 Como Rodar Localmente

### Pré-requisitos
- **Python 3.11+**
- **MySQL** instalado e rodando. 

### Passo a Passo

1. **Crie um ambiente virtual (recomendado):**
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

2. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure as Variáveis de Ambiente:**
   Duplique `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   Edite o `.env` com as credenciais do seu banco MySQL local:
   ```env
   # Exemplo para MySQL
   DATABASE_URL=mysql+pymysql://root:senha@localhost:3306/checkinsys_db
   SECRET_KEY=sua_chave_secreta_aqui
   ```

4. **Configurar o Banco de Dados:**
   - Crie o banco no MySQL: `CREATE DATABASE checkinsys_db;`
   - Execute as migrações:
     ```bash
     alembic upgrade head
     ```
   - Popule com dados iniciais (admin/users):
     ```bash
     python app/scripts/seed.py
     ```

5. **Inicie o Servidor:**
   ```bash
   uvicorn app.main:app --reload
   ```
   - API Docs: `http://localhost:8000/docs`

---

## ☁️ Como Rodar Online (Deploy)
 - phpMyAdmin)

Para configurar o banco MySQL na KingHost que já utilizamos no projeto:

1. **Acesse o Painel de Controle KingHost.**
2. Vá em **"Gerenciar Bancos de Dados"** (MySQL).
3. Utilize o **phpMyAdmin** para visualizar e gerenciar o banco.
4. Anote o **Host** (geralmente `mysql.dominiocliente.com.br`), **Usuário** e **Nome do Banco**.
5. **Connection String:**
   A URL para o seu `.env` de produção será:
   ```
   DATABASE_URL=mysql+pymysql://usuario_king:senha_king@host_kinghost:3306
   DATABASE_URL=postgresql://usuario_king:senha_king@host_kinghost:5432/nome_banco_king
   ```

### 2. Deploy da Aplicação (VPS / Cloud)

Como o backend é Python/FastAPI, recomenda-se hospedar em um serviço que suporte Docker ou Python (Ex: DigitalOcean Droplet, Railway, Render, ou VPS KingHost).

**Variáveis de Produção (Environment Variables):**
No servidor de produção, configure:
- `ENVIRONMENT=production`
- `DEBUG=False`
- `DATABASE_URL` (Sua string de conexão da KingHost acima)
- `SECRET_KEY` (Gere uma chave forte e única)
- `CORS_ORIGINS` (A URL do seu frontend Vercel, ex: `https://checklist-app.vercel.app`)

**Comando de Start (Produção):**
Não use `--reload`. Use `gunicorn` com `uvicorn` workers ou apenas `uvicorn` em modo produção:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Rodando Migrations em Produção:**
Sempre que atualizar o código, rode as migrations no banco de produção:
```bash
alembic upgrade head
```

---

## 🛠️ Boas Práticas e Manutenção

- **Adicionar Novos Campos/Tabelas:**
  1. Modifique/Crie o modelo em `app/models/`.
  2. Gere uma nova migração: `alembic revision --autogenerate -m "descricao_da_mudanca"`.
  3. Verifique o arquivo gerado em `alembic/versions/`.
  4. Aplique: `alembic upgrade head`.

- **Logs e Monitoramento:**
  - Em produção, erros são logados na saída padrão (stdout). Use ferramentas como Sentry para monitorar erros em tempo real.

- **Atualizar Dependências:**
  - Se instalar novas libs (`pip install pacote`), lembre-se de atualizar o requirements: `pip freeze > requirements.txt`.

- **API Docs:**
  - A documentação `/docs` é gerada automaticamente. Mantenha os Schemas (`app/schemas`) bem descritos para que a documentação seja útil.
