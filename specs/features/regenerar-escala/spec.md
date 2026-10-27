# Feature: Regenerar escala de sustentação

| Campo | Valor |
| --- | --- |
| Status | `implementada` |
| Spec de produto | Escala de sustentação / Batman |
| Módulos | `BatmanModule.html`; `regenerateBatmanSchedule` em `Code.gs` |

## Objetivo

Tech Manager gera turnos futuros na `Escala_Sustentacao` sem editar a planilha à mão.

## Defaults (perguntas do backlog fechadas)

| Pergunta | Decisão |
| --- | --- |
| Apaga futuros? | Não. Só **acrescenta**. O início efetivo é o maior entre a data pedida e o dia seguinte ao último `Data_Fim` já existente. |
| Duração padrão | 1 semana por turno (configurável no formulário, mín. 1). |
| Quem executa | Só `Tech Manager`. |

## Entrada

- `dataInicio` (obrigatória)
- `quantidadeTurnos` (inteiro ≥ 1)
- `duracaoSemanas` (inteiro ≥ 1, default 1)

## Regras

1. Rodízio: `Ativo_Escala = Sim`, ordem `Ordem_Escala` crescente.
2. IDs `ESC-xxx` (maior existente + 1).
3. Nome e e-mail copiados de `Integrantes_Squad`.
4. Status calculado como nas demais leituras (`syncEscalaStatus`).
5. Sem integrantes ativos na escala → erro claro.

## Interface

Botão “Gerar turnos” na aba Batman (só gestor). Modal com os três campos.
