# ADR 002 — Deploy via clasp mantendo URL da Web App

| Campo | Valor |
| --- | --- |
| Status | Aceito |
| Data | 2026-10-19 |

## Contexto

A URL produtiva é usada pela squad. Nova implantação no Apps Script gera URL nova.

## Decisão

- Código canônico no GitHub (`Main`).
- CI: `clasp push` + `clasp deploy --deploymentId` da implantação produtiva.
- Credenciais clasp em secret (`CLASPRC_JSON`); nunca no repositório.

## Consequências

- Nunca rodar `clasp deploy` sem `--deploymentId` no CI.
- Alteração de Script ID / Deployment ID exige atualizar `.clasp.json` e o workflow.
