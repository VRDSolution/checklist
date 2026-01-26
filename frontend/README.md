# 🎨 Frontend - Sistema de Check-in

O frontend do sistema de Check-in é uma Single Page Application (SPA) construída com **React**, **TypeScript** e **Vite**, utilizando **TailwindCSS** para estilização.

## 📂 Estrutura de Pastas e Páginas

A estrutura do projeto dentro de `src/` está organizada da seguinte forma:

### Principais Pastas
- **`src/pages/`**: Contém as telas principais da aplicação.
  - `Login/`: Tela de autenticação.
  - `Dashboard/`: Visão geral e atalhos rápidos.
  - `Checkin/`: Tela do cronômetro e seleção de projetos.
  - `Checkout/`: Formulário de finalização de atividades.
  - `History/`: Listagem e filtros de check-ins passados.
  - `Projects/`: Gestão de projetos e clientes (CRUD).
- **`src/components/`**: Componentes reutilizáveis (botões, inputs, modais).
- **`src/services/`**: Camada de comunicação com o Backend (Axios, endpoints).
- **`src/store/`**: Gerenciamento de estado global (Zustand).
- **`src/hooks/`**: Custom hooks (useAuth, useTimer).
- **`src/contexts/`**: Contextos globais (AuthContext, ThemeContext).
- **`src/routes.tsx`**: Definição das rotas públicas e privadas.

---

## 💻 Como Rodar Localmente

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- Backend rodando (localmente ou remoto)

### Passo a Passo

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as Variáveis de Ambiente:**
   Duplique o arquivo `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   
   Edite o arquivo `.env.local` e configure a URL da API:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:3000` (ou a porta indicada no terminal).

---

## ☁️ Como Rodar Online (Deploy na Vercel)

A Vercel é a plataforma recomendada para hospedar este frontend React/Vite.

### Passo a Passo

1. **GitHub:**
   - Certifique-se de que o código está commitado no GitHub.

2. **Vercel Dashboard:**
   - Acesse [vercel.com](https://vercel.com) e faça login.
   - Clique em **"Add New..."** > **"Project"**.
   - Importe o repositório do `checklist`.

3. **Configurações do Projeto:**
   - **Framework Preset:** `Vite` (deve ser detectado automaticamente).
   - **Root Directory:** Clique em "Edit" e selecione a pasta `frontend`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. **Environment Variables (Variáveis de Ambiente):**
   Adicione a seguinte variável para apontar para o seu backend de produção:
   - `VITE_API_BASE_URL`: `https://api.seu-backend-producao.com` (Ex: URL da API hospedada).

5. **Deploy:**
   - Clique em **"Deploy"**. A Vercel irá construir o projeto e gerar uma URL (ex: `checklist-app.vercel.app`).

6. **Domínio Personalizado (Opcional):**
   - Vá em Settings > Domains e adicione seu domínio (ex: `app.vrdsolution.com`).

---

## 🛠️ Boas Práticas e Manutenção

- **Adicionar Novas Páginas:**
  1. Crie o componente em `src/pages/NovaPagina.tsx`.
  2. Registre a rota em `src/routes.tsx`.
- **Estilização:**
  - Utilize as classes utilitárias do **TailwindCSS**. Evite criar arquivos CSS separados, a menos que seja estritamente necessário.
- **Requisições API:**
  - Sempre utilize a instância configurada do Axios em `src/services/api.ts`.
  - Crie funções de serviço em `src/services/` (ex: `userService.ts`) ao invés de chamar a API diretamente nos componentes.
- **Tipagem:**
  - Mantenha os tipos TypeScript atualizados em `src/types/`. Não use `any`.

---
**Dica:** Em caso de erro "Network Error", verifique se o `VITE_API_BASE_URL` está correto e se o Backend permite CORS para a origem do frontend.
