# Backlog: Regenerar escala de sustentação

| Campo | Valor |
| --- | --- |
| Prioridade | `média` |
| Status | `proposto` |

## Problema

Não há fluxo definido para regenerar a escala Batman a partir de uma data, com N turnos, respeitando `Ativo_Escala` e `Ordem_Escala`.

## Objetivo

Permitir (provavelmente ao gestor) gerar ou estender turnos na aba `Escala_Sustentacao` sem editar a planilha à mão.

## Hipótese de solução

- Entrada: data inicial + quantidade de turnos (ou até uma data fim).
- Rodízio só com `Ativo_Escala = Sim`, ordem `Ordem_Escala`.
- Grava linhas com IDs `ESC-xxx`, status calculado como hoje.

## Perguntas em aberto

- A regeneração apaga turnos futuros ou só acrescenta?
- Duração padrão de cada turno (semanas)?
- Quem pode executar: só Tech Manager ou qualquer integrante?

## Dependências

- Spec atual de Escala de sustentação / Batman
- `Integrantes_Squad` (`Ativo_Escala`, `Ordem_Escala`)
