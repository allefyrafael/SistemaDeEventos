# EventPass

Plataforma web modular (PWA) para organização de eventos: passaporte digital, QR Code dinâmico, scanner offline e gamificação por carimbos. Cada evento ativa apenas os módulos que precisa.

## Stack

Monorepo pnpm com **NestJS 11 + Prisma 6** (`apps/api`), **Next.js 15 + React 19 + Tailwind + Serwist PWA + ZXing** (`apps/web`) e schemas Zod compartilhados (`packages/shared`). Postgres 16 e Redis 7 sobem via Docker Compose.

## Pré-requisitos

- Node.js ≥ 20
- pnpm ≥ 9 — `npm install -g pnpm@latest`
- Docker Desktop
- Git ≥ 2.49

## Setup

```bash
git clone https://github.com/allefyrafael/SistemaDeEventos
cd SistemaDeEventos
cp .env.example .env
pnpm install

pnpm db:up                            # sobe Postgres + Redis
cd apps/api
pnpm prisma migrate dev               # aplica migrations
pnpm prisma:seed                      # admin + evento + empresas + alunos demo
```

Dois terminais para o dev:

```bash
cd apps/api && pnpm dev   # http://localhost:3001
cd apps/web && pnpm dev   # http://localhost:3000
```

## Credenciais demo

| Perfil | Credenciais |
|--------|-------------|
| Admin | CPF `00000000000` · senha `admin1234` |
| Estudante interno | matrícula `UC24101130` · CPF `33333333333` |
| Empresa (TechCo) | CPF `11111111111` · senha `empresa1234` |
| Empresa (Carreiras Hub) | CPF `22222222222` · senha `empresa1234` |

Visitante externo se auto-cadastra em [/cadastro/visitante](http://localhost:3000/cadastro/visitante).

## Comandos úteis

```bash
pnpm typecheck            # tsc --noEmit em todos os workspaces
pnpm test                 # unit (jest / vitest)
pnpm lint
pnpm shared:build         # rebuild dos schemas Zod compartilhados
pnpm db:reset             # apaga volumes + sobe Postgres/Redis do zero
```

Após puxar mudanças que tocam `packages/shared` ou `schema.prisma`:

```bash
pnpm install
pnpm shared:build
cd apps/api && pnpm prisma generate
```

## Estrutura

```
apps/
  api/   @eventpass/api     NestJS 11 + Prisma 6 + Postgres + Redis
  web/   @eventpass/web     Next.js 15 + Tailwind + Serwist + ZXing
packages/
  shared/  @eventpass/shared   Zod schemas + tipos compartilhados
docker-compose.yml          Postgres 16 + Redis 7
```

Detalhes do schema vivem em [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma). Catálogo de módulos feature, tipos e contratos da API em [`packages/shared/src/`](packages/shared/src/).

## Conceitos centrais

- **Eventos modulares** — `Event.config.modules` lista as features ativas (`passport`, `qr_scan`, `feedback`, `companies`, `student_profile`, `dashboard_live`, `exports_csv`, `venue_map`, …). Rotas usam `@RequiresModule('xxx')` e retornam 404 se a feature não está ligada.
- **4 estratégias de login** — admin (CPF + senha), empresa (2 CPFs distintos da mesma company), estudante interno (matrícula + CPF), visitante externo (CPF + senha criada no auto-cadastro).
- **QR Code anti-fraude** — JWT curto (TTL 30s, secret separado) com `jti` único reservado no Redis no primeiro scan; replay rejeitado.
- **Scanner offline** — fila em IndexedDB com idempotency key; sincroniza ao voltar online.
- **Passaporte N:M** — cada `StampConfig` pode ter N empresas autorizadas via tabela junção `StampConfigCompany`. Lista vazia = qualquer empresa do evento pode carimbar.

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `tsc` não reconhecido | Rode `pnpm install` na raiz primeiro |
| `Cannot find module @eventpass/shared` | Rode `pnpm shared:build` |
| Postgres não sobe | `docker ps` — verifique Docker Desktop rodando |
| Porta 3000/3001 ocupada | Ajuste em `apps/{web,api}/package.json` |
| Acesso de celular pela rede local falha | Use `ngrok http 3000` (workaround conhecido) |

## Licença

Privado.
