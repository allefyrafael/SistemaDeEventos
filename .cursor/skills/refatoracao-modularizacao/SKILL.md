---
name: refatoracao-modularizacao
description: Orienta refatoracao, modularizacao e desacoplamento de codigo com foco em sistemas extensveis por funcionalidades (modulos, feature flags, monorepo). Prioriza contratos claros, dependencias unidirecionais e codigo limpo. Usar quando o usuario pedir refatoracao, modularizar, reduzir acoplamento, separar responsabilidades, preparar novo modulo, extrair componente ou servico, ou revisar arquitetura de uma feature.
---

# Refatoracao e modularizacao

## Objetivo

Reduzir acoplamento entre partes do sistema, facilitar acrescentar ou desligar funcionalidades e manter codigo legivel e testavel — alinhado a monorepos como **API (Nest) + Web (Next) + `packages/shared`**, com modulos ativaveis por evento.

## Principios (ordem de prioridade)

1. **Fronteiras explicitas**: cada modulo (API, pagina, pacote) declara o que expoe; o resto importa apenas superficies publicas (`index.ts`, DTOs, componentes de pasta).
2. **Dependencia aponta para dentro**: camadas externas dependem de contratos internos estaveis, nao o contrario (ex.: `shared` nao importa `apps/api`).
3. **Um motivo para mudar**: arquivo/funcao pequenos; se um trecho muda por dois motivos distintos (ex. regra de negocio + formato de UI), separar.
4. **Configuracao e regra de negocio fora da UI**: Next chama API ou hooks; calculos criticos e validacao duplicavel ficam em `shared` (Zod) + API (servico).
5. **Reutilizacao por composicao**: preferir props e injecao a heranca profunda; componentes “burros” onde possivel.

## Padroes neste repositorio

| Camada | Responsabilidade | Evitar |
|--------|------------------|--------|
| `packages/shared` | Tipos, Zod, catalogo de modulos, metadados | Importar React, Nest, Prisma |
| `apps/api/src/modules/*` | Caso de uso, Prisma, guards por rota | Logica de apresentacao, URL de frontend |
| `apps/web/src/components/*` | UI reutilizavel, sem rota fixa | Chamadas diretas espalhadas sem `api.ts` / hook |
| `apps/web/src/app/*` | Rotas, composicao, estado de pagina | Duplicar schemas de validacao (usar `@eventpass/shared`) |

- **Novo modulo de produto**: espelhar `FEATURE_MODULES` (shared + `event-modules` na API), endpoint em modulo Nest isolado, UI condicionada a `event.modules`.
- **Componente reutilizavel** (ex. mapa): props + callbacks; sem `useRouter` ou `api` embutidos quando o mesmo bloco pode servir em outro contexto.

## Checklist antes de considerar “bem modular”

- [ ] Import ciclico? (se sim, extrair tipo/contrato para `shared` ou arquivo neutro.)
- [ ] A mesma string de rota ou nome de modulo aparece em 3+ lugares? (centralizar constante ou `FEATURE_MODULE_ADMIN_SETUP`.)
- [ ] Testar “desligar” a feature: remover import/rota ainda deixa build verde?
- [ ] Contrato HTTP / props documentado pelo tipo TypeScript exportado?
- [ ] Servico com mais de ~300 linhas ou muitos `if` por tipo? (extrair sub-servicos ou estrategia por `kind`.)

## Refatoracao segura (passos)

1. **Congelar comportamento**: identificar entrada/saida (endpoint, props, evento).
2. **Extrair sem mudar assinatura**: mover codigo para funcao/classe/arquivo novo; testes manuais ou build.
3. **Inverter dependencia**: introduzir interface ou tipo no pacote compartilhado se duas camadas precisam do mesmo contrato.
4. **Remover codigo morto** so depois do extrair estar em uso.

## Anti-padroes

- Pagina admin importando servico interno da API ou Prisma.
- `any` para “passar rapido”; preferir `unknown` + parse Zod ou tipo estreito.
- Componente que mistura fetch, formatacao complexa e layout — separar hook `useX` + subcomponentes.
- Modulo backend que importa outro modulo so para pegar um DTO; mover DTO para `shared` ou duplicar tipo minimo.

## Codigo limpo (criterios curtos)

- Nomes que leem como frase; funcoes verbo; booleanos `is/has/can`.
- Early return; menos aninhamento; sem “flag booleana” que significa tres estados — usar union ou enum.
- Comentarios so para “porque”, nao “o que” obvio.
- Mensagens de erro ao usuario: claras, sem vazar stack interna.

## Quando NAO refatorar

- Correcao pontual de bug: corrija o minimo; refatoracao grande no mesmo PR aumenta risco.
- Codigo que sera apagado em seguida.

## Referencia rapida de direcao de dependencia

```
apps/web  -->  packages/shared
apps/api  -->  packages/shared
packages/shared  -->  (nenhum app)
```

---

Manter este arquivo enxuto; detalhes de modulo especifico (ex. mapa, passaporte) vivem no codigo e em skills de dominio (ex. `design-system`).
