# Feature: Releases & Batman (aba unificada)

| Campo | Valor |
| --- | --- |
| Status | `implementada` |
| Spec de produto | `Spec_Engenharia_vd_Plus_Core.md` → abas, Escala, Controle de Releases |
| Módulos | `ReleasesBatmanModule.html`; `Code.gs` (`getEscalaBatman`, `getReleaseControls`, `regenerateBatmanSchedule`, helpers) |
| Abas / dados | Uma aba **Releases & Batman**; `Controle_Releases` + `Escala_Sustentacao` |

## Problema

Duas abas (Escala/Batman e Controle de Releases) com regras e UIs divergentes geravam redundância e leituras conflitantes do Batman.

## Objetivo

Uma única aba **Releases & Batman**: layout da antiga Escala/Batman (hero + cronograma), calendário mensal melhorado (herdado do Controle de Releases) e **regras únicas** de Batman/release.

## Fora de escopo

- Hub completo (deploys PT/CO, responsável/coresponsável, impacto de capacidade na entidade release) — permanece em `specs/backlog/controle-de-releases-hub.md`.
- Alterar Calendário de Deploy / `Planejamento_Deploys`.

## Regras de negócio (únicas)

1. Fonte de plantão: `Escala_Sustentacao`. Vínculo preferencial: `Controle_Release_ID` (+ `Release_Tribo_VD`).
2. **Batman do dia** (grade): turno cujo intervalo contém o dia; se vários, prefere o vinculado à release que cobre o dia; senão o de `Data_Inicio` mais antiga. Chip só em **dia útil** com release (sem Sáb/Dom/feriado P1).
3. **Batman da release** (card/hero): turno com `Controle_Release_ID` = id da release; se nenhum, fallback por maior overlap na janela (legado).
4. **Batman da vez** (hero): turno que contém hoje (civil); exibe chip da release vinculada.
5. Gerar turnos: Tech Manager pode escolher uma release ativa → datas/duração derivadas da janela, `quantidade=1`, grava vínculo nas colunas de release.
6. CRUD/import de releases permanece (canEdit); mesmas APIs de fase 1.

## Interface

Ordem: **hero** → **calendário mensal** → **cronograma por release** (cards + histórico colapsável).  
Ações: Nova release, Importar BM, Gerar turnos.

## Critérios de aceite

- [x] Uma aba `Releases & Batman`; abas separadas Batman e Controle de Releases removidas da navegação
- [x] Layout hero + cronograma preservado (visual Batman)
- [x] Calendário mensal na mesma aba, visual alinhado aos cards
- [x] Batman do dia / da release / da vez usam as regras únicas acima
- [x] Gerar turnos com select de release grava vínculo
- [x] Spec de produto atualizada
