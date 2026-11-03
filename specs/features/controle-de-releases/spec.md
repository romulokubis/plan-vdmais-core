# Feature: Controle de Releases (fase 1)

| Campo | Valor |
| --- | --- |
| Status | `implementada` |
| Spec de produto | `Spec_Engenharia_vd_Plus_Core.md` → Controle de Releases, `Controle_Releases`, abas, eventos |
| Módulos | `ReleasesControlModule.html`; funções em `Code.gs`; logo Batman embutido (data URI) |
| Abas / dados | `Controle_Releases` (nova); leitura de `Escala_Sustentacao` e feriados P1 |
| Protótipo visual | `prototypes/controle-releases.html` (aprovado) |
| Backlog origem | `specs/backlog/controle-de-releases.md` |

## Problema

Janelas da release tribal ficam duplicadas em `Planejamento_Deploys`, sem tela dedicada, sem import das datas da Businessmap (Programação de Releases) e sem visão de quem é o Batman no período.

## Objetivo

Módulo **Controle de Releases**, paralelo ao fluxo de deploys: cadastro manual, import BM (dry-run → criar + atualizar janelas), calendário híbrido, Batman automático pela escala.

## Fora de escopo (fase 1)

- Alterar `Planejamento_Deploys`, `CalendarModule` ou `DeployModal`.
- Gravar Batman / deploys PT/CO / responsável / coresponsável em `Controle_Releases`.
- Hub — `specs/backlog/controle-de-releases-hub.md`.

## Decisões fechadas

| Tema | Decisão |
| --- | --- |
| Relação com deploys | Paralelo |
| UI | Grade mensal + Detalhes das releases do período |
| Semana na grade | DOM → SÁB |
| Contagem | Dias úteis (SEG–SEX sem feriado/ponte P1) |
| Batman | Automático via `Escala_Sustentacao` (turno operacional = **2 semanas**; grade mostra o plantonista **do dia**; detalhes listam turnos que cruzam a janela) |
| Import BM | Dry-run → criar + atualizar janelas |
| Logo Batman | PNG original embutido (data URI) |

## Regras de negócio

1. Linha ativa = release tribal com janela inclusiva.
2. Cancelar = `Status = Cancelado` (exclusão lógica); import não reativa.
3. Manual: `Origem = Manual`.
4. Import: board `879` / workflow `8641`; match `releaseMatchKey`; datas do título `(DD/MM a DD/MM)`.
5. Dry-run obrigatório; confirmação revalida no servidor e aplica.
6. Atualização BM: datas + card id + origem; não altera `Observacao`.
7. Dias úteis excluem Sáb/Dom e feriados/pontes com `bloqueiaDeploy`.
8. Batman só na UI (cruzamento com escala). A escala atual é rodízio por **turno de 2 semanas**, não plantão diário. Visão futura (hub): **um Batman por release**, com duração alinhada à janela da release (~2 semanas).

## Dados

Ver tabela `Controle_Releases` na spec de produto.

## Permissões

Leitura: autenticado. Escrita / confirmar import: `canEdit` (`isUserAuthorized`).

## Interface / API / eventos

Conforme spec de produto e implementação em `ReleasesControlModule.html` + `Code.gs`.

## Critérios de aceite

- [x] Aba `Controle_Releases` criada sob demanda com schema
- [x] Aba na Web App com grade + detalhes
- [x] Cadastro, edição e cancelamento com RBAC
- [x] Import BM dry-run + confirmação (criar/atualizar)
- [x] Batman automático pela escala
- [x] Fins de semana e feriados P1 fora da contagem
- [x] Logo Batman via asset (não emoji de bandeira nesta fase na grade)
- [x] Calendário de Deploy inalterado
- [x] Spec de produto atualizada

## Notas de implementação

Arquivos: `ReleasesControlModule.html`, `Index.html`, `Code.gs`, `Spec_Engenharia_vd_Plus_Core.md`, `specs/features/controle-de-releases/spec.md`.

**Incidente (listagem vazia):** a leitura passou a chamar `cellToSheetDateString` sem a função existir no mesmo deploy; o front ainda chamava `render()` após erro e mascarava a falha. Corrigido em commit posterior — ver armadilhas em `AGENTS.md`.
