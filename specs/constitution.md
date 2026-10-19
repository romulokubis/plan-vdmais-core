# Constituição — Engenharia vd+ Core

Regras estáveis. Mudança aqui exige alinhamento explícito do time.

## 1. Spec primeiro

- Comportamento de produto vive em `Spec_Engenharia_vd_Plus_Core.md` e em `specs/features/`.
- Código sem respaldo na spec é dívida: ou a spec é atualizada, ou o código é revertido/ajustado.

## 2. Plataforma

- Runtime: Google Apps Script (V8), fuso `America/Sao_Paulo`.
- Dados: planilha vinculada (**Plan Engenharia - DB**).
- UI: Web App; deploy produtivo mantém a mesma URL de implantação.
- Código-fonte canônico: este repositório GitHub; publicação via `clasp` (CI na `Main`).

## 3. Arquitetura de frontend

- `Index.html` = shell (abas, Tailwind, Chart.js, `AppShell`).
- Um arquivo HTML por módulo; JS em IIFE com namespace em `window`.
- Módulos não se chamam entre si: só `CustomEvent` na `window`.
- `AppShell` é o único que chama `init()` / `show()` dos módulos.
- Backend: funções retornam `JSON.stringify({ success, ... })`.

## 4. Segurança e credenciais

- Businessmap e demais segredos: **Script Properties**, nunca no código.
- Credenciais `clasp` (`.clasprc.json`): só local / GitHub Actions Secrets.
- Quem grava no backend precisa estar em `Integrantes_Squad` (salvo regras mais restritas da feature, ex.: ausências).

## 5. Idioma e datas

- Interface e docs de produto: português do Brasil.
- Datas na UI: `DD/MM/AAAA`. Backend aceita também `D/M/AAAA` e `AAAA-MM-DD`.

## 6. Deploy

- Push na `Main` → `clasp push` + `clasp deploy --deploymentId` da Web App produtiva.
- **Proibido** criar implantação nova no CI (mudaria a URL).
