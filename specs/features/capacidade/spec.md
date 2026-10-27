# Feature: Capacidade — waterfall, participação e UX

| Campo | Valor |
| --- | --- |
| Status | `implementada` |
| Spec de produto | Capacidade; `Integrantes_Squad`; forecast |
| Módulos | `CapacityModule.html`; `getCapacity`, `getThroughputForecast` em `Code.gs` |

## Objetivo

Tornar a Capacidade auditável e utilizável: preservar filtro, loading claro, breakdown dos descontos, participação configurável, e ponte simples com o forecast (cards por dia efetivo).

## Regras

### Participação (`Integrantes_Squad`)

| Coluna | Conteúdo |
| --- | --- |
| Participacao_Capacidade | Número 0–1. Vazio: default pelo Papel (Developer=1, Tech Lead=0,3, Tech Manager=fora) |
| Ativo_Capacidade | `Sim` ou `Não`. Vazio = `Sim`. `Não` tira a pessoa da conta |

### Waterfall (agregado da squad, em horas; UI em dias)

Ordem inalterada. A API devolve cortes ponderados pela participação:

1. `base` — dias úteis × jornada × participação
2. `feriados` — feriados/pontes
3. `ausencias`
4. `batman`
5. `rituais`
6. `total` (= efetiva) = base − cortes (não negativo)

Sem lista por pessoa na UI.

### UX

- Trocar de aba **não** reseta o filtro nem dispara consulta se já houver resultado no período atual.
- Enquanto consulta: cards em `…`, botão Consultar desabilitado.
- Sem `meses[].acumulado` na API.
- Forecast: rótulos “Cenário conservador (P15)” / “Mediana (P50)” / “Cenário otimista (P85)”; texto deixa claro que o Monte Carlo **não** usa os dias efetivos — só o horizonte em meses.
- Ponte: `cardsPorDiaEfetivo` = mediana do forecast ÷ dias efetivos do período (se dias > 0).

### Ritos — `Data_Ancora` (opcional)

Se preenchida:

- Quinzenal: semanas a partir da segunda da âncora, a cada 14 dias.
- Mensal/Trimestral/Semestral: dia do mês da âncora (se cair em fim de semana, próximo dia útil), nos mesmos meses-alvo.

Sem âncora: comportamento atual (ISO ímpar / 1º dia útil).

## Critérios de aceite

- [x] Waterfall na API e na UI
- [x] Participacao_Capacidade / Ativo_Capacidade
- [x] Quick wins de filtro, loading, rótulos, sem acumulado
- [x] Ponte cards/dia efetivo
- [x] Data_Ancora opcional nos ritos
