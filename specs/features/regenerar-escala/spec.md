# Feature: Regenerar escala de sustentação

| Campo | Valor |
| --- | --- |
| Status | `implementada` |
| Spec de produto | Escala de sustentação / Batman |
| Módulos | `BatmanModule.html`; `regenerateBatmanSchedule` / `getEscalaBatman` / `ensureEscalaSheet` em `Code.gs` |

## Objetivo

Tech Manager gera turnos futuros na `Escala_Sustentacao` sem editar a planilha à mão. A UI da aba Batman navega por release (hero + próximos + histórico), sem lista plana infinita.

## Defaults (perguntas do backlog fechadas)

| Pergunta | Decisão |
| --- | --- |
| Apaga futuros? | Não. Só **acrescenta**. O início efetivo é o maior entre a data pedida e o dia seguinte ao último `Data_Fim` já existente. |
| Duração padrão | Alinhada à **vigência da release de negócio**. O formulário ainda pede `duracaoSemanas` (mín. 1); não há default dogmático de 2 semanas. |
| Quem executa | Só `Tech Manager`. |
| Gerar a partir de `Controle_Releases`? | **Fora desta entrega** (hub / backlog). |

## Entrada

- `dataInicio` (obrigatória)
- `quantidadeTurnos` (inteiro ≥ 1)
- `duracaoSemanas` (inteiro ≥ 1)

## Schema

Colunas no fim de `Escala_Sustentacao` (não alteram índices 1–8):

- `Release_Tribo_VD`
- `Controle_Release_ID`

`getEscalaBatman` garante os headers, sincroniza `Status`, devolve os campos de release e pode fazer backfill por overlap com releases ativas (só células vazias).

## Regras

1. Rodízio: `Ativo_Escala = Sim`, ordem `Ordem_Escala` crescente.
2. IDs `ESC-xxx` (maior existente + 1).
3. Nome e e-mail copiados de `Integrantes_Squad`.
4. Status calculado como nas demais leituras (`syncEscalaStatus`).
5. Sem integrantes ativos na escala → erro claro.
6. Geração deixa `Release_Tribo_VD` / `Controle_Release_ID` vazios (vínculo via backfill ou hub futuro).

## Interface

- Botão “Gerar turnos” na aba Batman (só gestor). Modal com os três campos; copy orienta duração = janela da release.
- Cronograma: hero com release, cards de próximos, histórico colapsável por trimestre + filtros.
