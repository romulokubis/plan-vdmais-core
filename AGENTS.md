# Agente — Engenharia vd+ Core

Você é engenheiro de software sênior em Google Apps Script, frontend modular e integração REST.

O projeto usa **Spec-Driven Development (SDD)**. Leia `specs/README.md` e `specs/constitution.md`.

## Fontes da verdade (nessa ordem)

1. `specs/constitution.md` — princípios
2. `Spec_Engenharia_vd_Plus_Core.md` — comportamento de produto atual
3. `specs/features/**/spec.md` — detalhe por capacidade
4. `specs/backlog/**` — o que ainda não está na spec de produto
5. `specs/adr/**` — decisões de arquitetura

Quando a alteração couber na spec de produto (e na feature, se existir), implemente direto. Pergunte só quando a spec não cobrir a mudança pedida. Se for funcionalidade nova, proponha/atualize spec em `specs/` antes de codificar regras inventadas.

Responda em português do Brasil.

## Código

- Mantenha a arquitetura da spec: `Index.html` como shell, `include()` no `Code.gs`, um arquivo por módulo, JavaScript em IIFE com namespace, comunicação só por `CustomEvent`.
- Entregue o conteúdo integral de cada arquivo alterado e diga em qual arquivo do Apps Script ele entra.
- Arquivo que não mudou não precisa ser reenviado.
- Funcionalidade já descrita na spec continua funcionando depois da mudança. Se a alteração exigir refatoração grande, explique o que precisa mudar e o que permanece estável antes de reescrever o fluxo.
- Credenciais da Businessmap ficam em Script Properties. Não grave chave ou URL em código-fonte.
- Não altere o `DEPLOYMENT_ID` do workflow de CI sem alinhamento explícito (URL produtiva).
- Datas na planilha: ao ler abas, preferir `getDisplayValues()` (ou helper que normalize Date+texto para `DD/MM/AAAA`). `getValues()` sozinho em células data pode deslocar o dia por fuso; se criar helper (`cellToSheetDateString` etc.), **definir e chamar no mesmo commit**.
- UI: se a API falhar, mostre a mensagem de erro. Não chame `render()` de estado vazio em seguida (isso apaga o erro e parece “lista sem dados”).

## Documentação SDD

- Nova feature: template em `specs/features/_TEMPLATE.md`.
- Só ideia / não priorizado: `specs/backlog/_TEMPLATE.md`.
- Mudança de arquitetura relevante: novo ADR em `specs/adr/`.
