# Engenharia da squad vd+ Core

Aplicação web em Google Apps Script, vinculada à planilha **Plan Engenharia - DB**, com leitura de cards na Businessmap API v2. Centraliza a operação da squad vd+ Core:

1. **Capacidade.** Horas efetivas da squad num período escolhido na tela, com o acumulado mês a mês, e a previsão de cards por Monte Carlo. A conta de horas é por pessoa no servidor; a tela não mostra pessoa.
2. **Escala de sustentação (Batman).** Rodízio de quem atende a sustentação em cada período.
3. **Calendário de deploy.** Releases por instância (Portugal e Colômbia), com bloqueio de datas proibidas.
4. **Feriados e recesso.** Feriados da planilha e pontes calculadas, com indicação de quais bloqueiam deploy.
5. **Release notes.** Texto categorizado a partir dos cards da release.
6. **Ausências.** Cadastro de férias, licenças e ausências parciais em horas, com impacto na capacidade.

Fuso horário: `America/Sao_Paulo`. A semana começa na segunda-feira. Datas são exibidas como `DD/MM/AAAA`. Na leitura das abas, o backend aceita `DD/MM/AAAA`, `D/M/AAAA` e `AAAA-MM-DD`.

## Arquitetura

O projeto Apps Script é vinculado à planilha e usa `SpreadsheetApp.getActiveSpreadsheet()`.

`Index.html` é o shell: cabeçalho, abas, containers e o `AppShell`. Cada módulo traz o próprio HTML, CSS e JavaScript e entra por `include()`.

```javascript
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Engenharia vd+ Core')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

No `Index.html`, cada módulo entra com `<?!= include('NomeDoModulo'); ?>`.

O JavaScript de cada módulo fica numa IIFE com namespace único, exposto em `window`:

```javascript
window.CalendarModule = (function () {
  var state = {};

  function render() {}

  return {
    init: function () {},
    show: function () {}
  };
})();
```

Regras:

- O `AppShell` é o único que chama `init()` e `show()` dos módulos. Cada módulo é inicializado uma vez só, pelo `AppShell`. Módulo não registra `DOMContentLoaded` próprio.
- Um módulo não chama função de outro módulo. A comunicação entre módulos é por `CustomEvent` na `window`.
- Funções do servidor retornam `JSON.stringify({ success, ... })`. Em erro, `{ success: false, message }`.
- Bibliotecas externas (Tailwind, Chart.js) são carregadas no `Index.html`.

## Arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `Code.gs` | `doGet`, `include`, permissões, leitura e gravação das abas, validação de deploy, feriados e pontes, Businessmap |
| `Index.html` | Shell, Tailwind, Chart.js, abas e `AppShell` |
| `HeaderModule.html` | Saudação e tema |
| `CapacityModule.html` | Capacidade e gráfico |
| `BatmanModule.html` | Escala de sustentação (`window.BatmanModule`) |
| `CalendarModule.html` | Lista de deploys por mês, editar e cancelar |
| `DeployModal.html` | Formulário de criar e editar deploy |
| `HolidaysModule.html` | Feriados, pontes e recesso por ano |
| `ReleaseNotesModule.html` | Release notes |
| `AbsencesModule.html` | Lista e formulário de ausências (`window.AbsencesModule`) |

## Abas e navegação

| Aba | Container | Módulo |
| --- | --- | --- |
| 📊 Capacidade da Squad | `view-capacity` | `CapacityModule` |
| 🦇 Escala de sustentação / Batman | `view-batman` | `BatmanModule` |
| 📅 Calendário de Deploy | `view-calendar` | `CalendarModule` |
| 🌴 Feriados & Recesso | `view-holidays` | `HolidaysModule` |
| 📦 Release Notes | `view-releasenotes` | `ReleaseNotesModule` |
| 🏖️ Ausências | `view-absences` | `AbsencesModule` |

A aba inicial é **Calendário de Deploy**. Trocar de aba esconde os outros containers e chama `show()` do módulo da aba, quando existir.

## Permissões

Pode editar quem tem o e-mail da sessão (`Session.getActiveUser().getEmail()`) na coluna `Email` da aba `Integrantes_Squad`. A comparação ignora maiúsculas e espaços.

Quem não está na aba só consulta. Botões de criar, editar e cancelar ficam ocultos. O backend repete a verificação em toda função que grava.

`getUserPermissions` devolve `{ email, canEdit, isManager, papel }`. `isManager` é verdadeiro quando `Papel` é `Tech Manager`.

### Ausências

Só integrante da squad cria, edita ou cancela. Regras de alvo:

- O próprio colaborador cadastra, edita e cancela **somente a própria** ausência.
- O gestor (`Papel = Tech Manager`) cadastra, edita e cancela ausência de **qualquer** integrante.
- Colega sem papel de gestor **não** cadastra ausência de outro colega.

A lista de ausências ativas é visível a qualquer usuário autenticado da aplicação. Botões de ação só aparecem para quem pode gravar no alvo.

## Dados

### `Integrantes_Squad`

| Coluna | Conteúdo |
| --- | --- |
| ID | `DEV-000`, `DEV-001`, ... |
| Nome | Nome completo |
| Email | E-mail corporativo |
| Papel | `Tech Lead`, `Developer`, `Tech Manager` |
| Ativo_Escala | `Sim` ou `Não` |
| Ordem_Escala | Posição no rodízio. `0` para quem não entra |
| Estado | Estado usado para casar feriado estadual. Vazio se não houver |
| Cidade | Cidade usada para casar feriado municipal. Vazio se não houver |

### `Escala_Sustentacao`

| Coluna | Conteúdo |
| --- | --- |
| ID | `ESC-100`, `ESC-101`, ... |
| Desenvolvedor_Email | E-mail |
| Desenvolvedor_Nome | Nome exibido |
| Data_Inicio | Início do turno |
| Data_Fim | Fim do turno, inclusive |
| Duracao_Semanas | Informativo |
| Status | `Concluído`, `Ativo` ou `Programado` |
| Observacao | Texto livre |

### `Feriados_e_Pontes`

| Coluna | Conteúdo |
| --- | --- |
| Data | `DD/MM/AAAA` |
| Nome do Feriado | Nome |
| Esfera | `Nacional`, `Estadual`, `Municipal` ou `Recesso` |
| Região | `Brasil`, estado, cidade ou `Grupo Boticário` |

Pontes não são cadastradas. O backend calcula em memória.

### `Planejamento_Deploys`

Uma linha é o deploy de uma release em uma instância. Cada release da tribo costuma ter uma linha para Portugal e outra para a Colômbia.

| Coluna | Conteúdo |
| --- | --- |
| ID_Release | `REL-001`, `REL-002`, ... |
| Release_Tribo_VD | Ex.: `Release 5.16` |
| Data_inicio_release | Início da janela de desenvolvimento |
| Data_fim_release | Fim da janela de desenvolvimento |
| Release_Sistema | Versão no sistema de destino |
| Data_Deploy | Data do deploy. Vazia quando `Em definição` |
| Responsavel | E-mail |
| Status | `Em definição`, `Agendado`, `Concluído` ou `Cancelado` |
| Observacao | Texto livre |
| Instancia | `Portugal` ou `Colômbia` |

### `Rituais_e_Overhead`

A carga muda quando o time muda os ritos. O cálculo lê a aba no momento da consulta.

| Coluna | Conteúdo |
| --- | --- |
| Ritual | Nome do ritual |
| Horas_Semana | Horas por semana útil de cinco dias, por pessoa |
| Obrigatorio | `Sim` ou `Não`. Só `Sim` entra na conta |

### `Ausencias_e_Eventos`

| Coluna | Conteúdo |
| --- | --- |
| ID | `AUS-001`, `AUS-002`, ... |
| Desenvolvedor | E-mail do ausente |
| Data_Inicio | Início |
| Data_Fim | Fim, inclusive |
| Tipo | `Ferias`, `Licenca`, `Treinamento`, `Consulta medica`, `Compensacao de horas` ou outro texto |
| Modalidade | `Dia` ou `Hora` |
| Horas | Obrigatória quando `Modalidade = Hora`. Vazia quando `Modalidade = Dia` |
| Observacao | Texto livre |
| Criado_Por | E-mail de quem cadastrou |
| Status | `Ativo` ou `Cancelado` |

Criar:

- O ID é o maior número de `ID` existente mais um, no formato `AUS-000`.
- `Criado_Por` é o e-mail da sessão.
- `Status` nasce `Ativo`.
- `Data_Fim` não pode ser anterior a `Data_Inicio`.
- Com `Modalidade = Dia`, `Horas` fica vazia.
- Com `Modalidade = Hora`, `Horas` deve ser um número maior que zero.

Editar: o dono ou o gestor altera período, tipo, modalidade, horas e observação. `Criado_Por` e `ID` permanecem.

Cancelar é exclusão lógica: `Status` vira `Cancelado`. Ausências canceladas não entram na capacidade nem na lista padrão da tela.

Compatibilidade: linha legada sem `ID`/`Modalidade`/`Status` ainda é lida. Sem `Modalidade`, vazio em `Horas` vale como `Dia` e valor preenchido vale como `Hora`. Sem `Status`, vale `Ativo`. Na primeira gravação, o backend migra a aba legada para o schema novo.

## Feriados e pontes

Na mesma data pode haver mais de uma linha. Vence a de maior prioridade: `Nacional` e `Recesso` (1), `Estadual` (2), `Municipal` (3).

Só feriados com vencedor de prioridade 1 bloqueiam deploy e geram ponte. Estaduais e municipais aparecem na aba de feriados como informativos, com deploy permitido.

Pontes:

- Feriado de prioridade 1 na quinta-feira torna a sexta seguinte uma ponte.
- Feriado de prioridade 1 na terça-feira torna a segunda anterior uma ponte.
- Feriado em outro dia da semana não gera ponte.
- Se a data da ponte já é feriado, ela continua como feriado e não aparece duplicada.
- Ponte não gera outra ponte.

## Deploys

Uma data é recusada para deploy quando é:

1. Sábado ou domingo.
2. Sexta-feira.
3. Feriado de prioridade 1 ou ponte.
4. Dia útil imediatamente anterior a um feriado de prioridade 1.

A validação roda no backend ao criar e ao editar. A mensagem de recusa diz o motivo.

Criar:

- O ID é o maior número de `ID_Release` existente mais um, no formato `REL-000`.
- `Responsavel` é o e-mail da sessão.
- `Status` nasce `Agendado`.

Editar:

- `Responsavel` mantém o valor original.
- O status pode ser qualquer um dos quatro.

Cancelar é exclusão lógica: o status vira `Cancelado`. Deploys cancelados não aparecem no calendário.

O calendário lista os deploys agrupados por mês da `Data_Deploy`, ou da `Data_inicio_release` quando não há data de deploy, em ordem cronológica. Cada card mostra instância, release do sistema, status, release da tribo, janela de desenvolvimento e data do deploy.

## Escala de sustentação

O plantonista vigente é o do turno cujo intervalo `Data_Inicio`–`Data_Fim` contém a data de hoje.

Ao carregar a escala, o backend grava a coluna `Status` de cada turno com as duas datas preenchidas:

- `Data_Fim` anterior a hoje: `Concluído`.
- O intervalo contém hoje: `Ativo`.
- `Data_Inicio` posterior a hoje: `Programado`.

Turno sem data interpretável não é alterado. A tela mostra o plantonista vigente em destaque e a lista de turnos em ordem cronológica. O selo da tabela usa o status já gravado.

Participam do rodízio só integrantes com `Ativo_Escala = Sim`, na ordem de `Ordem_Escala`.

## Capacidade

A tela consulta um período, com início e fim inclusivos. O atalho **Este mês** preenche o mês corrente. O resultado não é gravado.

Entram na conta:

- `Developer`: participação 1.
- `Tech Lead`: participação 0,3.
- `Tech Manager`: fora da conta.

Jornada: 7,5 horas de segunda a sexta. Não há fator de foco.

Para cada pessoa, no período filtrado:

1. Os dias candidatos são segunda a sexta.
2. Sai o feriado que se aplica à pessoa e a ponte de feriado nacional ou recesso.
3. Sai a ausência com `Status` ativo (ou sem status, na linha legada). `Modalidade = Dia` (ou `Horas` vazio na linha legada): cada dia útil do intervalo sai por inteiro. `Modalidade = Hora` (ou `Horas` preenchido na linha legada): desconta essa quantidade no cruzamento com o período, no máximo as horas desses dias. Ausência `Cancelado` não entra.
4. Dia que sobrou e cai num turno de sustentação dessa pessoa vale zero para entrega. O turno tira 100% do dia.
5. `Horas_base` é a soma das horas dos dias que ainda restam.
6. `H_rituais` é a soma de `Horas_Semana` obrigatórias, vezes os dias de entrega da pessoa, dividido por 5.
7. `Horas_Efetivas = participacao × max(0, Horas_base - H_rituais)`.

O total da squad é a soma das horas efetivas de quem entrou na conta.

Feriado casa pelo texto, sem diferenciar maiúsculas nem acento:

- `Nacional` e `Recesso` valem para toda a squad.
- `Estadual` vale quando `Região` é o `Estado` da pessoa.
- `Municipal` vale quando `Região` é a `Cidade` da pessoa.

Cidade ou estado novo passa a valer quando existe na pessoa e numa linha de feriado. Não há lista fechada no código. Pessoa sem estado não recebe feriado estadual. Pessoa sem cidade não recebe feriado municipal.

A tela mostra três números da squad: horas efetivas do período, o período filtrado e as horas de ritos descontadas nesse período. O rótulo na tela é **Ritos no período**. Não há lista, nome, papel nem gráfico por pessoa. A resposta de `getCapacity` também não devolve esses campos.

O gráfico mostra as horas efetivas de cada mês separadamente, dentro do período filtrado. Não há soma acumulada entre os meses. O total do período continua sendo uma conta só, com o corte de rituais no fim, e é repartido entre os meses na proporção das horas de entrega de cada mês. A soma das barras mensais coincide com o total da squad.

### Previsão de cards

O mesmo botão **Consultar** chama `getThroughputForecast`. As horas e os cards não se convertem.

O histórico não segue o filtro. São os seis meses civis já encerrados antes do mês corrente, no fuso `America/Sao_Paulo`, no board `335`. Entra o card ativo ou arquivado cuja `first_end_time` cai nesse intervalo: a primeira vez que foi para Done ou Ready to archive. Entram somente os tipos Story e Technical Story. Os ids saem pelo nome em `/boards/335/cardTypes` e, se ali não aparecerem os dois, em `/cardTypes`. Se nenhum dos dois caminhos trouxer esses nomes, valem os ids já vistos neste board: Story `1` e Technical Story `12`. Também fica de fora o card cuja coluna atual ou última coluna é uma destas: `80228` (⛔ Cancelado), `124129` (Cancelado), `139956` (Cancelled). Mês sem card entra nas simulações com zero. O histórico fica em cache por 6 horas.

O período filtrado só define o horizonte: a quantidade de meses civis que o intervalo toca. Cada mês do horizonte sorteia, com reposição, um dos seis meses do histórico. São 10.000 simulações. A tela mostra o cenário conservador (percentil 15), a mediana e o cenário otimista (percentil 85). O gráfico principal agrupa o histórico em blocos do mesmo tamanho do horizonte e coloca ao lado a faixa projetada do período filtrado, com um marcador na mediana. O gráfico mensal permanece abaixo, como histórico usado nas simulações, somente quando o horizonte tem mais de um mês. A descrição na tela é: `VD Plataforma Core · De {início} a {fim}. Cada mês entra nas simulações com o mesmo peso. Resultado de 10.000 simulações. (somente os tipos Story e Technical Story; cancelados ficam de fora)`.

Se o filtro não começa no dia 1 e termina no último dia do mês final, a tela avisa que a previsão usa meses cheios e as horas usam os dias escolhidos. A resposta não traz título, dono nem lista de cards.

## Release notes

Credenciais só em Script Properties: `BUSINESSMAP_BASE_URL` e `BUSINESSMAP_API_KEY`.

O board da squad é **VD Plataforma Core**, id `335`, no workspace VS Internacional - Times. Release notes e throughput leem esse board.

A categoria de cada card sai da primeira tag que casar com a tabela. Sem tag compatível, vale o nome do tipo do card. Comparação sem diferenciar maiúsculas e sem acento.

O card da release fica no board `879` (Internacional VD - Nível 3 - Iniciativas), workflow `8641` (Programação de Releases). Os cards da squad se ligam a ele como item relativo, na seção Relativos e Dependências. Outras squads ligam seus cards como filhos, e esses filhos não entram. A tela escolhe uma linha de `Planejamento_Deploys` que não esteja cancelada. O backend procura nesse workflow, entre cards ativos e arquivados, o card cujo título começa com `Release_Tribo_VD`. A comparação ignora maiúsculas, acentos e espaços, então `Release 5.18` casa com `Release 5. 18 (29/09 a 12/10)`. Entram só os relativos que estão no board `335`. Cards do tipo Ticket ficam de fora. Também fica de fora o card cuja coluna atual ou última coluna é uma destas: `80228` (⛔ Cancelado), `124129` (Cancelado), `139956` (Cancelled). Se nenhum card sobrar, a tela mostra só o cabeçalho e avisa que a release não tem cards da squad. Seção sem cards não aparece. Cada card entra como uma linha com o título.

| Categoria | Tag ou tipo |
| --- | --- |
| Novidades | `epic`, `feature`, `novidade`, `nova funcionalidade` |
| Melhorias | `improvement`, `melhoria`, `ux` |
| Correções | `bug`, `defect`, `correcao` |
| Infraestrutura | `tech debt`, `debito tecnico`, `infra`, `refactor`, `infraestrutura` |
| Outros | Qualquer card sem correspondência |

Formato:

```text
📦 Release {número da release} - {Data_Deploy em DD/MM/AAAA}
🚀 Novidades
✨ Melhorias
🐛 Correções
⚙️ Infraestrutura
Outros
```

Seção sem cards não aparece. Cada card entra como uma linha com o título.

## Interface

Saudação: `Olá {PrimeiroNome}, como está o seu dia?` `PrimeiroNome` é o trecho do e-mail antes de `@` e do primeiro `.`, com inicial maiúscula. Enquanto o e-mail não chega, a saudação é `Olá, como está o seu dia?`.

Tema claro e escuro com Tailwind (`darkMode: 'class'`). A escolha fica em `localStorage` na chave `vdCore_theme`, com valor `light` ou `dark`. Sem valor salvo, vale a preferência do sistema.

## Ausências (tela)

A aba lista ausências com `Status = Ativo`, ordenadas por `Data_Inicio`. Cada linha mostra nome (ou e-mail), período, tipo, modalidade, horas (se `Hora`) e observação.

Integrante da squad vê o botão de cadastrar. No formulário:

- Colaborador comum: o campo de pessoa fica fixo no próprio e-mail.
- Gestor: escolhe o integrante em lista vinda de `Integrantes_Squad`.
- `Modalidade = Dia` esconde o campo de horas. `Modalidade = Hora` exige o valor.
- Tipos sugeridos no select: `Ferias`, `Licenca`, `Treinamento`, `Consulta medica`, `Compensacao de horas`, `Outro`.

Ações de editar e cancelar só aparecem quando o usuário é o dono da ausência ou gestor.

## Eventos

| Evento | Quem dispara | `detail` | Quem escuta |
| --- | --- | --- | --- |
| `vdCore:permissionsLoaded` | `AppShell` | `{ email, canEdit, isManager, papel }` | `CalendarModule`, `AbsencesModule` |
| `vdCore:openDeployModal` | `CalendarModule` | Deploy a editar, ou nada para criar | `DeployModal` |
| `vdCore:deployScheduled` | `DeployModal` e `CalendarModule` após gravar ou cancelar | Nenhum | `CalendarModule` recarrega a lista |
| `vdCore:absenceChanged` | `AbsencesModule` após gravar, editar ou cancelar | Nenhum | `AbsencesModule` recarrega a lista |
| `vdCore:themeChanged` | `HeaderModule` | `{ theme: "light" }` ou `{ theme: "dark" }` | `CapacityModule` |

## Em aberto

- Como regenerar a escala: a partir de qual data e com quantos turnos.
