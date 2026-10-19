# ADR 001 — Arquitetura modular em Apps Script

| Campo | Valor |
| --- | --- |
| Status | Aceito |
| Data | 2026-10-19 |

## Contexto

A Web App concentra várias capacidades (capacidade, Batman, deploys, feriados, release notes, ausências). Precisa evoluir sem um único HTML monolítico.

## Decisão

- Shell em `Index.html` + `include()` por módulo.
- Um arquivo HTML por módulo; JS em IIFE + `window.NomeModulo`.
- Comunicação entre módulos apenas por `CustomEvent`.
- Backend em `Code.gs` com respostas JSON stringificadas.

## Consequências

- Novas telas = novo módulo + aba no shell + (se gravar) funções no `Code.gs` + seção na spec.
- Proibido importar/chamar funções de outro módulo no cliente.
