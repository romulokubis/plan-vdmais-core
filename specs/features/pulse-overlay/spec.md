# Feature: vd+ Pulse Overlay

| Campo | Valor |
| --- | --- |
| Status | `implementada` |
| Spec de produto | Eventos; `LoadingOverlay.html` |
| Módulos | `LoadingOverlay.html`, `Index.html` (`AppShell.loading`); consumidores em todos os módulos de dados |

## Objetivo

Dar feedback visual sempre que o backend estiver carregando, em qualquer aba.

## Comportamento

- Overlay global com blur, marca **vd+** e anéis em órbita teal.
- Mensagem contextual por fluxo.
- Delay ~150 ms; mínimo visível ~300 ms.
- Contador para chamadas paralelas.
- `reset` ao trocar de aba.
- API: `AppShell.loading.start/done` ou eventos `vdCore:loading` / `vdCore:loadingDone`.
