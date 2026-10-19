# Spec-Driven Development (SDD) — vd+ Core

Este repositório usa **SDD**: a especificação precede o código. Alteração de comportamento começa na spec; o código implementa a spec.

## Fonte da verdade

| Documento | Papel |
| --- | --- |
| [`constitution.md`](./constitution.md) | Princípios que não se negociam no dia a dia |
| [`../Spec_Engenharia_vd_Plus_Core.md`](../Spec_Engenharia_vd_Plus_Core.md) | Spec de produto (comportamento atual) |
| [`features/`](./features/) | Specs por capacidade (detalhe + status) |
| [`backlog/`](./backlog/) | Próximas funcionalidades ainda não na spec de produto |
| [`adr/`](./adr/) | Decisões de arquitetura registradas |

## Fluxo para nova funcionalidade

1. **Propor** — criar item em `backlog/` (ou usar o template).
2. **Especificar** — mover/criar pasta em `features/<nome>/` com `spec.md` até cobrir regras, dados, UI, permissões e eventos.
3. **Integrar** — quando aprovado, incorporar o comportamento em `Spec_Engenharia_vd_Plus_Core.md` e marcar a feature como `implementada` ou `em progresso`.
4. **Implementar** — só depois da spec cobrir o pedido (ou com gaps explícitos acordados).
5. **Validar** — conferir se o código respeita a spec; atualizar spec se a realidade mudar de propósito.

## Fluxo para correção / ajuste

- Se a spec já descreve o comportamento certo: corrigir o código.
- Se a spec está errada ou incompleta: atualizar a spec **antes** ou **junto** com o código, no mesmo PR/commit quando possível.

## O que o agente deve fazer

Ver `AGENTS.md` e `.cursor/rules/sdd.mdc`. Em resumo: ler a spec de produto + feature relevante; não inventar regra fora da spec; perguntar só quando a spec não cobrir.
