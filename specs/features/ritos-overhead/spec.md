# Feature: Ritos por cadência e ocorrência

| Campo | Valor |
| --- | --- |
| Status | `implementada` |
| Spec de produto | `Rituais_e_Overhead`, Capacidade, aba Ritos |
| Módulos | `RitualsModule.html`, `CapacityModule.html`; CRUD e `getCapacity` em `Code.gs` |
| Aba planilha | `Rituais_e_Overhead` (nome legado; sem categoria Overhead) |

## Objetivo

Modelar ritos por **cadência** e **horas por ocorrência**, para que o desconto na capacidade caia só nas datas em que o rito ocorre no período filtrado. Overhead sai do produto (UI, cálculo e gestão).

## Dados

| Coluna | Conteúdo |
| --- | --- |
| ID | `RIT-001`, ... |
| Nome | Nome do rito |
| Horas_Ocorrencia | Horas descontadas em cada ocorrência, por pessoa |
| Cadencia | `Diaria`, `Quinzenal`, `Mensal`, `Trimestral` ou `Semestral` |
| Obrigatorio | `Sim` ou `Não`. Só `Sim` entra na conta |

### Ocorrências no período filtrado

| Cadência | Quando ocorre |
| --- | --- |
| Diaria | Cada dia útil (seg–sex) do intervalo |
| Quinzenal | Segunda-feira de cada semana ISO ímpar que intersecta o intervalo |
| Mensal | Primeiro dia útil de cada mês tocado pelo intervalo |
| Trimestral | Primeiro dia útil de jan, abr, jul e out tocados pelo intervalo |
| Semestral | Primeiro dia útil de jan e jul tocados pelo intervalo |

Migração: planilha com `Horas_Semana`/`Categoria` vira `Horas_Ocorrencia = Horas_Semana ÷ 5` e `Cadencia = Diaria`. Linhas `Categoria = Overhead` são descartadas na migração.

## Capacidade

Ordem por pessoa no período: dias úteis → feriados/pontes → ausências → Batman → ritos nas datas de ocorrência → soma restante × participação.

- Em cada data de ocorrência com horas restantes, desconta até `Horas_Ocorrencia`.
- `Horas_Efetivas = participação × horas restantes após ritos`.
- UI: dias efetivos, período, ritos (dias). API devolve `rituais` em horas (sem `overhead`).
- O gráfico mensal usa as horas já após o corte de ritos, então ritos raros pesam só nos meses em que caem.

## Tela de gestão

- Aba **Ritos**: lista + criar/editar/excluir.
- Quem grava: `Tech Manager` (`isManager`).
- Lista visível a qualquer usuário autenticado da app.

## Critérios de aceite

- [x] Schema `Horas_Ocorrencia` + `Cadencia` (com migração a partir de `Horas_Semana`)
- [x] Overhead removido da UI, do CRUD e de `getCapacity`
- [x] Capacidade aplica ritos por ocorrência no período
- [x] CRUD pela tela, só Tech Manager
