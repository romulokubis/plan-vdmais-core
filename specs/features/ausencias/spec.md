# Feature: Ausências

| Campo | Valor |
| --- | --- |
| Status | `implementada` |
| Spec de produto | `Spec_Engenharia_vd_Plus_Core.md` → `Ausencias_e_Eventos`, Capacidade, Ausências (tela), Permissões |
| Módulos | `AbsencesModule.html`; `getAbsences`, `saveAbsence`, `updateAbsence`, `cancelAbsence`, `getSquadMembers` em `Code.gs` |
| Aba | `Ausencias_e_Eventos` |

## Objetivo

Permitir que integrantes registrem férias/licenças (dias) e ausências parciais (horas), com impacto correto na capacidade, sem cadastro peer-to-peer entre colegas.

## Regras de negócio

1. `Modalidade = Dia`: zera dias úteis do intervalo; `Horas` vazia.
2. `Modalidade = Hora`: exige `Horas > 0`; desconta só essas horas no cruzamento com o período.
3. Linha legada sem `Modalidade`: `Horas` vazio = Dia; preenchido = Hora.
4. `Status = Cancelado` não entra na capacidade nem na lista padrão.
5. Colaborador só opera a própria ausência; `Tech Manager` (gestor) opera qualquer integrante.
6. Cancelar é exclusão lógica (`Status = Cancelado`).

## Permissões

- Lista: qualquer usuário autenticado da app.
- Criar / editar / cancelar: integrante da squad + regra de alvo (próprio ou gestor).

## Critérios de aceite

- [x] Schema com ID, Modalidade, Observacao, Criado_Por, Status
- [x] Aba Ausências no front
- [x] Capacidade respeita Modalidade e Status
- [x] URL/Web App e demais módulos inalterados no fluxo feliz
