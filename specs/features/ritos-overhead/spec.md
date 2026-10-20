# Feature: Ritos e Overhead separados

| Campo | Valor |
| --- | --- |
| Status | `implementada` |
| Spec de produto | `Rituais_e_Overhead`, Capacidade, aba Ritos & Overhead |
| Módulos | `RitualsModule.html`, `CapacityModule.html`; CRUD e `getCapacity` em `Code.gs` |
| Aba planilha | `Rituais_e_Overhead` |

## Objetivo

Separar tempo de **ritos** e **overhead** na capacidade (mesmo desconto, cards distintos) e permitir cadastrar/editar linhas pela Web App.

## Dados

| Coluna | Conteúdo |
| --- | --- |
| ID | `RIT-001`, ... |
| Nome | Nome do item |
| Horas_Semana | Horas por semana útil de 5 dias, por pessoa |
| Obrigatorio | `Sim` ou `Não`. Só `Sim` entra na conta |
| Categoria | `Ritual` ou `Overhead` |

Linha legada sem `ID`/`Categoria`: migra na primeira gravação/leitura de gestão; sem categoria vale `Ritual`.

## Capacidade

- `H_ritos` e `H_overhead` usam a mesma fórmula (`Horas_Semana × diasEntrega ÷ 5`), cada um só com a própria categoria e `Obrigatorio = Sim`.
- `Horas_Efetivas = participação × max(0, Horas_base − H_ritos − H_overhead)`.
- UI: dias efetivos, período, ritos (dias), overhead (dias). API devolve `rituais` e `overhead` em horas.

## Tela de gestão

- Aba **Ritos & Overhead**: lista + criar/editar/excluir.
- Quem grava: `Tech Manager` (`isManager`).
- Lista visível a qualquer usuário autenticado da app.

## Critérios de aceite

- [x] Coluna `Categoria` e IDs na planilha (com migração legada)
- [x] Capacidade separa ritos e overhead na conta e na UI
- [x] CRUD pela tela, só Tech Manager
