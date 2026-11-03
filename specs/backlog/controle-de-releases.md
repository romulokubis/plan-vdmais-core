# Backlog: Controle de Releases (fase 1 — paralelo)

| Campo | Valor |
| --- | --- |
| Prioridade | `alta` |
| Status | `priorizado` → **promovido** para `specs/features/controle-de-releases/spec.md` |

## Problema

Janelas de desenvolvimento da release tribal ficam espalhadas/duplicadas em `Planejamento_Deploys`, sem tela dedicada para planejar o período, importar datas da Businessmap (Programação de Releases) nem enxergar quem é o Batman no intervalo da release.

## Objetivo

Módulo paralelo **Controle de Releases** (sem alterar ainda o fluxo de deploys): cadastro manual, import BM, calendário híbrido, Batman automático pela escala.

## Decisões (fechadas)

- Paralelo a `Planejamento_Deploys` / Calendário de Deploy.
- UI híbrida; semana DOM→SÁB; Sáb/Dom e feriados fora da contagem.
- Schema aba `Controle_Releases`: `ID`, `Release_Tribo_VD`, `Data_Inicio`, `Data_Fim`, `Origem`, `Businessmap_Card_Id`, `Status`, `Observacao`, `Atualizado_Em`.
- Import BM: **dry-run → criar + atualizar janelas**.
- Batman: **automático** pela `Escala_Sustentacao`.
- Visual aprovado: `prototypes/controle-releases.html`.

## Feature spec

[`specs/features/controle-de-releases/spec.md`](../features/controle-de-releases/spec.md)

## Visão futura

[`controle-de-releases-hub.md`](./controle-de-releases-hub.md)
