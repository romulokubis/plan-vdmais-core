# ADR 003 — Web App executa como o implantador (`USER_DEPLOYING`)

| Campo | Valor |
| --- | --- |
| Status | Aceito |
| Data | 2026-10-27 |

## Contexto

Com `executeAs: USER_ACCESSING`, cada usuário do domínio precisa autorizar OAuth de planilha (`spreadsheets.currentonly`). Vários integrantes abriam a app e recebiam:

`Você não tem permissão para chamar SpreadsheetApp.getActiveSpreadsheet`.

Os escopos já estavam em `appsscript.json`; o problema era consentimento por usuário, não ausência de manifesto.

## Decisão

- Web App: `executeAs: USER_DEPLOYING`, `access: DOMAIN`.
- Leitura/gravação da planilha usa a identidade de quem fez o deploy (conta técnica / Tech Manager com acesso à planilha).
- Identidade do visitante para RBAC continua via `Session.getActiveUser().getEmail()` (Workspace + acesso DOMAIN).

## Consequências

- Usuários do domínio não precisam autorizar escopo de Sheets individualmente.
- Quem faz `clasp deploy` (CI / conta do secret) precisa ter acesso à planilha vinculada.
- Escrita indevida continua bloqueada pelo RBAC em `Integrantes_Squad` / Tech Manager.
- Após alterar `executeAs` no manifesto, o deploy com o mesmo `deploymentId` precisa republicar a configuração da Web App.
