# EventPass — Plataforma Modular para Eventos

Plataforma web responsiva (PWA) para digitalizar a operação de eventos: passaporte digital, QR Code dinâmico, scanner offline, gamificação por carimbos e dashboard em tempo real. Cada evento ativa apenas as features (módulos) que precisa.

## Visão Geral

- **Objetivo:** substituir passaportes de papel e listas em planilha por um fluxo digital de credenciamento, carimbo de visitas e feedback.
- **Escala alvo:** ~5.000 usuários simultâneos.
- **Mobile-first:** PWA roda no navegador (Android/iOS) sem precisar de loja.
- **Offline-ready:** o scanner da empresa funciona offline e sincroniza depois (idempotency key).
- **Segurança:** desenvolvimento orientado por testes, QR Code anti-fraude (JWT curto + jti single-use no Redis).

## Tech Stack

### Backend
- **NestJS 11** — Framework TypeScript com arquitetura modular nativa
- **Prisma 6** — ORM type-safe com migrations automáticas
- **PostgreSQL 16** — Banco relacional com JSONB para configs flexíveis
- **Redis 7** — Cache, rate-limit, fila de jobs (BullMQ), blacklist de JWTs
- **JWT + bcrypt** — Autenticação com 3 estratégias (Admin, Empresa, Estudante)
- **Helmet, CORS, Throttler** — Segurança por padrão

### Frontend
- **Next.js 15** — React 19 com App Router, SSR, TypeScript
- **Tailwind CSS 3.4** — Utility-first styling com tema configurável por evento
- **Serwist 9** — PWA (Service Worker, offline support, cache strategies)
- **Zod** — Validação de schemas (compartilhados com a API)
- **ZXing** — Leitura de QR Code via câmera

### Compartilhado
- **@eventpass/shared** — Workspace package com tipos/schemas Zod (auth, events, scan, etc.)
- **pnpm workspaces** — Monorepo com 3 pacotes (`apps/api`, `apps/web`, `packages/shared`)

### DevOps
- **Docker Compose** — Postgres + Redis locais
- **pnpm 9** — Package manager (workspaces nativas)
- **TypeScript 5.7** — Type-safe em todo o projeto

## Pré-requisitos

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm@latest`)
- **Docker Desktop** (para Postgres + Redis)
- **Git** (v2.49+)

## Como começar

### 1. Clone e instale

```bash
git clone https://github.com/allefyrafael/SistemaDeEventos
cd SistemaDeEventos
pnpm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Padrão funcional para dev:

```env
DATABASE_URL="postgresql://eventpass:eventpass_dev_password@localhost:5432/eventpass?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="dev-only-change-me-access-secret-min-32-chars"
JWT_REFRESH_SECRET="dev-only-change-me-refresh-secret-min-32-chars"
JWT_QR_SECRET="dev-only-change-me-qr-code-secret-rotates-often"
API_PORT=3001
WEB_PORT=3000
```

### 3. Suba a infra (Postgres + Redis)

```bash
pnpm db:up
docker compose ps   # esperar healthy (~10s)
```

### 4. Migrações e seed

```bash
cd apps/api
pnpm prisma migrate dev
pnpm prisma:seed
```

Isso cria:
- Tabelas do schema Prisma
- **Admin demo:** CPF `00000000000`, senha `admin1234`
- **Evento demo:** "Evento Demo 2026" com módulos básicos ativos
- 2 empresas (TechCo, Carreiras Hub), 2 estudantes demo

### 5. Rodar dev

**Terminal 1 — API:**
```bash
cd apps/api
pnpm dev   # http://localhost:3001
```

**Terminal 2 — Web:**
```bash
cd apps/web
pnpm dev   # http://localhost:3000
```

## Estrutura

```
SistemaDeEventos/
├── apps/
│   ├── api/                          # NestJS backend
│   │   ├── src/
│   │   │   ├── core/                 # Modulos globais (config, prisma, redis, module-registry)
│   │   │   ├── modules/              # Feature modules (auth, events, passport, scan, ...)
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── package.json
│   │
│   └── web/                          # Next.js frontend
│       ├── src/app/                  # Pages + layouts (App Router)
│       │   ├── page.tsx              # Home (redireciona por perfil)
│       │   ├── layout.tsx
│       │   ├── login/                # 3 telas de login (admin/empresa/estudante)
│       │   ├── admin/                # Dashboard admin
│       │   ├── empresa/              # Scanner + métricas
│       │   └── estudante/            # QR + feedback + progresso
│       ├── src/lib/                  # api client, auth, scan-queue offline
│       ├── public/                   # Assets estáticos (icons, manifest)
│       └── package.json
│
├── packages/
│   └── shared/                       # @eventpass/shared — tipos/schemas Zod
│       └── src/
│           ├── auth.ts
│           ├── events.ts
│           ├── scan.ts
│           ├── companies.ts
│           ├── feedback.ts
│           └── index.ts
│
├── docker-compose.yml                # Postgres 16 + Redis 7
├── .env.example
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## Autenticação

### 3 Estratégias de Login

```typescript
// Admin
POST /api/v1/auth/login/admin
{ "cpf": "00000000000", "senha": "admin1234" }

// Empresa (2 CPFs distintos da mesma empresa)
POST /api/v1/auth/login/empresa
{ "cpfEmpresa": "11111111111", "cpfResponsavel": "11111111112" }

// Estudante interno (matrícula + CPF)
POST /api/v1/auth/login/estudante
{ "matricula": "202600001", "cpf": "33333333333" }
```

**Resposta:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { "id": "...", "tipoPerfil": "ADMIN", "nome": "..." }
}
```

**Refresh / Logout:**
```
POST /api/v1/auth/refresh   { "refreshToken": "..." }
POST /api/v1/auth/logout    { "refreshToken": "..." }
```

### Rotas protegidas

Todas as rotas (exceto `/auth/*` e `/health/*`) exigem `Authorization: Bearer <accessToken>`. Use `@Public()` para abrir endpoints específicos.

## Módulos (ligáveis por evento)

Cada evento tem um `config` JSON listando os módulos ativos:

```json
{
  "modules": ["passport", "qr_scan", "feedback", "companies", "student_profile", "dashboard_live", "exports_csv"],
  "theme": { "primary": "#0057A3", "logoUrl": "..." },
  "passport": { "requiredStamps": 6 },
  "qr_scan": { "tokenTtlSeconds": 30, "rotateEverySeconds": 20 }
}
```

**Módulos disponíveis:**
- `passport` — Carimbos / gamificação
- `qr_scan` — QR Code dinâmico + scanner
- `feedback` — Avaliação pós-visita
- `companies` — Cadastro de expositores
- `student_profile` — LinkedIn + CV
- `dashboard_live` — Métricas em tempo real
- `exports_csv` — Exportação de concludentes
- `certificate` — Certificado digital (não implementado)
- `check_in` — Check-in de entrada (não implementado)
- `raffle` — Sorteio (não implementado)
- `venue_map` — Mapa interativo (em desenvolvimento)

### Como usar o ModuleRegistry

```typescript
@Controller('events/:eventId/passport')
@UseGuards(EnabledModuleGuard)
@RequiresModule('passport')
export class PassportController {
  @Get()
  getPassports(@Param('eventId') eventId: string) { ... }
}
```

Se o módulo não estiver ativo no evento, retorna `404 Not Found`.

## Tipos de estudante

`User.studentKind` distingue:
- **`INTERNAL`** — estudante cadastrado da instituição organizadora (com matrícula).
- **`EXTERNAL`** — visitante externo (sem matrícula). Cadastro próprio.

## Testes

```bash
pnpm test               # unit (Jest / Vitest)
pnpm test:watch
pnpm test:coverage
cd apps/web && pnpm test:e2e   # Playwright
```

## Type-check e Lint

```bash
pnpm typecheck
pnpm lint
```

## Endpoints principais

### Health
```
GET /api/v1/health/live      — sem dependências (liveness)
GET /api/v1/health           — com DB + Redis (readiness)
```

### Auth
```
POST /api/v1/auth/login/admin
POST /api/v1/auth/login/empresa
POST /api/v1/auth/login/estudante
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### Events
```
GET    /api/v1/events
POST   /api/v1/events
GET    /api/v1/events/:id
PATCH  /api/v1/events/:id
```

### Passport / Scan
```
GET  /api/v1/events/:eventId/passport/qr
POST /api/v1/events/:eventId/scan
POST /api/v1/events/:eventId/scan/sync
GET  /api/v1/events/:eventId/scan/grantable-stamps
GET  /api/v1/events/:eventId/scan/history
```

## Troubleshooting

### Docker não inicia
```bash
docker ps   # verifique se Docker Desktop está rodando
```

### Porta 3001/3000 ocupada
Libere a porta ou ajuste `apps/api/package.json` / `apps/web/package.json`.

### Prisma client não gerado
```bash
cd apps/api && pnpm prisma generate
```

### Erros de typecheck
```bash
pnpm typecheck
# se persistir:
rm -rf node_modules/.pnpm && pnpm install
```

## Contribuindo

1. Crie uma branch: `git checkout -b feat/sua-feature`
2. Faça commits com mensagens claras (ver histórico)
3. Rode testes + typecheck antes do PR: `pnpm test && pnpm typecheck`
4. Abra um PR descrevendo motivação e plano de teste

## Licença

Privado.
