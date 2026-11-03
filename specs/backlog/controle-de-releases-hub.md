# Backlog: Controle de Releases como hub (centralização)

| Campo | Valor |
| --- | --- |
| Prioridade | `média` |
| Status | `proposto` |

## Problema

Informações da release estão fragmentadas: janela e nome em deploys, Batman na escala, feriados/recesso em feriados, redução de time em ausências, datas de deploy por país no calendário. Falta uma visão única por release dos impactos no período.

## Objetivo

Evoluir o Controle de Releases (após a fase 1 paralela) para ser o **ponto central** de cada release tribal, reunindo:

- Quem é o **Batman da release** (período): **um Batman por release**, com permanência alinhada à janela (tipicamente **duas semanas**, como a escala atual).
- **Data de deploy de cada país** (Portugal / Colômbia) para aquela release.
- Em **todo deploy**: **responsável** e **coresponsável** que aplicam em PRD os itens desenvolvidos (obrigatórios no cadastro/edição).
- No período da release: **feriado / recesso / redução de time** (férias, atestado, licença, etc.).
- Visualização simples do **impacto por release** (capacidade efetiva, bloqueios, deploys).

## Hipótese de solução

- Promover a entidade mestre de release (criada na fase 1) a hub: deploys por instância passam a referenciar a release; overlays de feriados e ausências filtrados pela janela; **Batman atribuído à release** (não só derivado do rodízio global dia a dia).
- Schema de deploy (ou entidade filha): além de data/instância, `Responsavel` e `Coresponsavel` (e-mail/nome da squad); o campo legado `Responsavel` de `Planejamento_Deploys` evolui para esse par.
- Calendário / detalhe da release mostra camada única: janela (dias úteis) + Batman da release + deploys PT/CO com resp./coresp. + eventos que reduzem capacidade.
- Migrar gradualmente o que hoje vive só em `Planejamento_Deploys` (janelas duplicadas) para a entidade mestre, sem quebrar release notes e validação de deploy.

### Batman — hoje vs hub

| Hoje (fase 1) | Hub (futuro) |
| --- | --- |
| Rodízio em `Escala_Sustentacao`, turno de **2 semanas** | **Um Batman por release** |
| UI cruza escala × janela / dia | Batman amarrado à entidade release (duração ~ janela, ~2 semanas) |
| Geração de turnos ainda global na aba Batman | Escala pode passar a ser gerada/atribuída a partir das releases |

## Perguntas em aberto

- Ordem de migração: primeiro deploys → release, ou primeiro overlays (feriados/ausências) na UI da release?
- Release notes e Capacidade passam a filtrar só pela release mestre?
- Ao amarrar Batman à release: a aba Batman deixa de gerar rodízio global, ou passa a espelhar as atribuições por release?

## Dependências

- Fase 1: [`controle-de-releases.md`](./controle-de-releases.md) entregue e em uso.
- Abas existentes: `Planejamento_Deploys`, `Escala_Sustentacao`, `Ausencias_e_Eventos`, feriados/recesso.
