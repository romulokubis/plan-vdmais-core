/**
 * Engenharia vd+ Core - Backend Apps Script
 * Gerencia a renderização de templates, chamadas de sistema, autenticação por papéis (RBAC),
 * hierarquia de feriados e integração com Google Sheets DB.
 */

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

function getUserEmail() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (e) {
    Logger.log('[UserService] Erro ao obter e-mail do usuário: ' + e.toString());
    return '';
  }
}

/**
 * Valida se o usuário logado está cadastrado na aba 'Integrantes_Squad' (Coluna C - Email).
 */
function isUserAuthorized() {
  try {
    var userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) return false;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return false;

    var sheet = ss.getSheetByName('Integrantes_Squad');
    if (!sheet) return false;

    var data = sheet.getDataRange().getDisplayValues();
    if (!data || data.length <= 1) return false;

    userEmail = String(userEmail).trim().toLowerCase();

    // Coluna C é o e-mail (Índice 2 no array base 0)
    for (var i = 1; i < data.length; i++) {
      var emailInSheet = String(data[i][2] || '').trim().toLowerCase();
      if (emailInSheet === userEmail) {
        return true;
      }
    }
    return false;
  } catch (e) {
    Logger.log('[RBAC] Erro ao verificar permissões: ' + e.toString());
    return false;
  }
}

/**
 * Retorna as permissões do usuário ativo para o Frontend.
 */
function getUserPermissions() {
  try {
    var email = Session.getActiveUser().getEmail() || '';
    var canEdit = isUserAuthorized();
    return JSON.stringify({ success: true, email: email, canEdit: canEdit });
  } catch (e) {
    return JSON.stringify({ success: false, canEdit: false, message: e.toString() });
  }
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function formatSheetDate(dateObj) {
  return pad2(dateObj.getDate()) + '/' + pad2(dateObj.getMonth() + 1) + '/' + dateObj.getFullYear();
}

function parseSheetDate(str) {
  if (!str) return null;
  str = String(str).trim();
  var iso = str.indexOf('-') !== -1;
  var parts = iso ? str.split('-') : str.split('/');
  if (parts.length !== 3) return null;

  var year;
  var month;
  var day;
  if (iso && parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month, day);
}

function startOfToday() {
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function normalizeEscalaStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/í/g, 'i')
    .replace(/ú/g, 'u');
}

function expectedEscalaStatus(item, today) {
  var start = parseSheetDate(item.dataInicio);
  var end = parseSheetDate(item.dataFim);
  if (!start || !end) return '';
  if (end.getTime() < today) return 'Concluído';
  if (start.getTime() > today) return 'Programado';
  return 'Ativo';
}

function syncEscalaStatus(sheet, schedules) {
  var today = startOfToday().getTime();
  var updates = [];

  schedules.forEach(function(item) {
    var expected = expectedEscalaStatus(item, today);
    if (!expected || !item.sheetRow) return;
    if (normalizeEscalaStatus(item.status) === normalizeEscalaStatus(expected)) return;
    updates.push([item.sheetRow, expected]);
    item.status = expected;
  });

  updates.forEach(function(update) {
    sheet.getRange(update[0], 7).setValue(update[1]);
  });
}

function nextReleaseId(sheet) {
  var data = sheet.getDataRange().getDisplayValues();
  var max = 0;
  for (var i = 1; i < data.length; i++) {
    var match = String(data[i][0] || '').trim().match(/^REL-(\d+)$/i);
    if (!match) continue;
    var n = parseInt(match[1], 10);
    if (n > max) max = n;
  }
  var num = String(max + 1);
  while (num.length < 3) num = '0' + num;
  return 'REL-' + num;
}

function findVesperaHolidayName(dateObj, feriados) {
  var target = formatSheetDate(dateObj);
  for (var i = 0; i < feriados.length; i++) {
    var item = feriados[i];
    if (!item.bloqueiaDeploy) continue;
    if (item.tipo === 'ponte' || String(item.nome || '').indexOf('Ponte') === 0) continue;
    var holiday = parseSheetDate(item.data);
    if (!holiday) continue;
    var cursor = new Date(holiday.getFullYear(), holiday.getMonth(), holiday.getDate() - 1);
    while (cursor.getDay() === 0 || cursor.getDay() === 6) {
      cursor.setDate(cursor.getDate() - 1);
    }
    if (formatSheetDate(cursor) === target) return item.nome;
  }
  return '';
}

function loadFeriadosForValidation(dateObj) {
  var years = [dateObj.getFullYear()];
  if (dateObj.getMonth() === 0) years.push(dateObj.getFullYear() - 1);
  if (dateObj.getMonth() === 11) years.push(dateObj.getFullYear() + 1);

  var all = [];
  for (var i = 0; i < years.length; i++) {
    var parsed = JSON.parse(getFeriados(years[i]));
    if (parsed && parsed.success && parsed.data) all = all.concat(parsed.data);
  }
  return all;
}

/**
 * Módulo Batman: Busca a escala de sustentação da aba 'Escala_Sustentacao'.
 * O plantonista vigente é o turno cujo intervalo contém a data de hoje.
 */
function getEscalaBatman() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return JSON.stringify({ success: false, message: 'Planilha ativa não encontrada.' });
    }
    
    var sheet = ss.getSheetByName('Escala_Sustentacao');
    if (!sheet) {
      return JSON.stringify({ success: false, message: 'Aba "Escala_Sustentacao" não encontrada.' });
    }
    
    var data = sheet.getDataRange().getDisplayValues();
    if (!data || data.length <= 1) {
      return JSON.stringify({ success: true, activeDev: null, schedules: [] });
    }
    
    var rows = data.slice(1);
    var activeDev = null;
    var schedules = [];

    rows.forEach(function(row, index) {
      if (!row || (!row[0] && !row[2])) return;
      
      var item = {
        sheetRow: index + 2,
        id: String(row[0] || '').trim(),
        email: String(row[1] || '').trim(),
        nome: String(row[2] || '').trim(),
        dataInicio: String(row[3] || '').trim(),
        dataFim: String(row[4] || '').trim(),
        duracaoSemanas: String(row[5] || '').trim(),
        status: String(row[6] || '').trim(),
        observacao: String(row[7] || '').trim()
      };

      schedules.push(item);
    });

    try {
      syncEscalaStatus(sheet, schedules);
    } catch (writeError) {
      Logger.log('[Escala] Não foi possível atualizar a coluna Status: ' + writeError.toString());
    }

    schedules.sort(function(a, b) {
      var startA = parseSheetDate(a.dataInicio);
      var startB = parseSheetDate(b.dataInicio);
      if (!startA && !startB) return 0;
      if (!startA) return 1;
      if (!startB) return -1;
      return startA.getTime() - startB.getTime();
    });

    var today = startOfToday().getTime();
    schedules.forEach(function(item) {
      var start = parseSheetDate(item.dataInicio);
      var end = parseSheetDate(item.dataFim);
      if (!start || !end) return;
      if (start.getTime() <= today && today <= end.getTime()) activeDev = item;
    });

    schedules.forEach(function(item) {
      delete item.sheetRow;
    });

    return JSON.stringify({
      success: true,
      activeDev: activeDev,
      schedules: schedules
    });
  } catch (e) {
    return JSON.stringify({ success: false, message: 'Exceção no servidor: ' + e.toString() });
  }
}

/**
 * Módulo Calendário: Busca a lista de deploys agendados (ocultando registros cancelados).
 */
function getDeploysScheduled() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return JSON.stringify({ success: false, message: 'Planilha não encontrada.' });
    
    var sheet = ss.getSheetByName('Planejamento_Deploys');
    if (!sheet) return JSON.stringify({ success: true, data: [] });
    
    var data = sheet.getDataRange().getDisplayValues();
    if (!data || data.length <= 1) return JSON.stringify({ success: true, data: [] });
    
    var rows = data.slice(1);
    var deploys = [];

    rows.forEach(function(row) {
      if (!row || !row[0]) return;
      
      var statusVal = String(row[7] || 'Agendado').trim();
      if (statusVal.toLowerCase() === 'cancelado') return;

      deploys.push({
        id: String(row[0] || '').trim(),
        releaseTribo: String(row[1] || '').trim(),
        dataInicio: String(row[2] || '').trim(),
        dataFim: String(row[3] || '').trim(),
        releaseSistema: String(row[4] || '').trim(),
        dataDeploy: String(row[5] || '').trim(),
        responsavel: String(row[6] || '').trim(),
        status: statusVal,
        observacao: String(row[8] || '').trim(),
        instancia: String(row[9] || '').trim()
      });
    });

    return JSON.stringify({ success: true, data: deploys });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.toString() });
  }
}

/**
 * Salva um novo deploy com validação de permissão RBAC e bloqueio de datas.
 */
function saveDeploySchedule(payload) {
  try {
    if (!isUserAuthorized()) {
      return JSON.stringify({ 
        success: false, 
        message: 'Acesso negado: Apenas membros da squad vd+ Core podem realizar agendamentos.' 
      });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return JSON.stringify({ success: false, message: 'Planilha ativa não encontrada.' });
    
    var sheet = ss.getSheetByName('Planejamento_Deploys');
    if (!sheet) {
      sheet = ss.insertSheet('Planejamento_Deploys');
      sheet.appendRow([
        'ID_Release', 'Release_Tribo_VD', 'Data_inicio_release', 
        'Data_fim_release', 'Release_Sistema', 'Data Deploy', 
        'Responsavel', 'Status', 'Observacao', 'Instancia'
      ]);
    }
    
    var isBlocked = validateDeployDate(payload.dataDeploy);
    if (isBlocked.blocked) {
      return JSON.stringify({ 
        success: false, 
        message: 'A data selecionada para o deploy (' + payload.dataDeploy + ') está bloqueada: ' + isBlocked.reason 
      });
    }

    var idGenerated = nextReleaseId(sheet);

    var userEmail = Session.getActiveUser().getEmail() || 'usuario@grupoboticario.com.br';

    sheet.appendRow([
      idGenerated,
      payload.releaseTribo || '',
      payload.dataInicio || '',
      payload.dataFim || '',
      payload.releaseSistema || '',
      payload.dataDeploy || '',
      userEmail,
      'Agendado',
      payload.observacao || '',
      payload.instancia || ''
    ]);

    return JSON.stringify({ success: true, message: 'Deploy agendado com sucesso!', id: idGenerated });
  } catch (e) {
    return JSON.stringify({ success: false, message: 'Erro ao salvar: ' + e.toString() });
  }
}

/**
 * Atualiza um deploy com validação de permissão RBAC.
 */
function updateDeploySchedule(payload) {
  try {
    if (!isUserAuthorized()) {
      return JSON.stringify({ 
        success: false, 
        message: 'Acesso negado: Apenas membros da squad vd+ Core podem alterar agendamentos.' 
      });
    }

    if (!payload || !payload.id) {
      return JSON.stringify({ success: false, message: 'ID da release não informado.' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return JSON.stringify({ success: false, message: 'Planilha ativa não encontrada.' });
    
    var sheet = ss.getSheetByName('Planejamento_Deploys');
    if (!sheet) return JSON.stringify({ success: false, message: 'Aba "Planejamento_Deploys" não encontrada.' });
    
    var nextStatus = payload.status || 'Agendado';
    var skipsDateCheck = nextStatus === 'Em definição' || nextStatus === 'Cancelado';
    if (!skipsDateCheck) {
      var isBlocked = validateDeployDate(payload.dataDeploy);
      if (isBlocked.blocked) {
        return JSON.stringify({ 
          success: false, 
          message: 'A nova data selecionada para o deploy (' + payload.dataDeploy + ') está bloqueada: ' + isBlocked.reason 
        });
      }
    }

    var data = sheet.getDataRange().getDisplayValues();
    var rowIndex = -1;
    var currentOwner = '';

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(payload.id).trim()) {
        rowIndex = i + 1;
        currentOwner = String(data[i][6] || '').trim();
        break;
      }
    }

    if (rowIndex === -1) {
      return JSON.stringify({ success: false, message: 'Deploy com ID ' + payload.id + ' não foi encontrado na planilha.' });
    }

    sheet.getRange(rowIndex, 1, 1, 10).setValues([[
      payload.id,
      payload.releaseTribo || '',
      payload.dataInicio || '',
      payload.dataFim || '',
      payload.releaseSistema || '',
      payload.dataDeploy || '',
      currentOwner,
      nextStatus,
      payload.observacao || '',
      payload.instancia || ''
    ]]);

    return JSON.stringify({ success: true, message: 'Deploy ' + payload.id + ' atualizado com sucesso!' });
  } catch (e) {
    return JSON.stringify({ success: false, message: 'Erro ao atualizar deploy: ' + e.toString() });
  }
}

/**
 * Exclusão Lógica com validação de permissão RBAC.
 */
function deleteDeploySchedule(id) {
  try {
    if (!isUserAuthorized()) {
      return JSON.stringify({ 
        success: false, 
        message: 'Acesso negado: Apenas membros da squad vd+ Core podem excluir agendamentos.' 
      });
    }

    if (!id) return JSON.stringify({ success: false, message: 'ID da release não informado.' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return JSON.stringify({ success: false, message: 'Planilha ativa não encontrada.' });
    
    var sheet = ss.getSheetByName('Planejamento_Deploys');
    if (!sheet) return JSON.stringify({ success: false, message: 'Aba "Planejamento_Deploys" não encontrada.' });

    var data = sheet.getDataRange().getDisplayValues();
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(id).trim()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return JSON.stringify({ success: false, message: 'Deploy ' + id + ' não encontrado.' });
    }

    sheet.getRange(rowIndex, 8).setValue('Cancelado');

    return JSON.stringify({ success: true, message: 'Deploy ' + id + ' removido com sucesso!' });
  } catch (e) {
    return JSON.stringify({ success: false, message: 'Erro ao excluir deploy: ' + e.toString() });
  }
}

/**
 * Validação de Bloqueio de Data de Deploy (Finais de Semana, Sextas-feiras, Feriados Nacionais e Pontes).
 */
function validateDeployDate(dateStr) {
  if (!dateStr) return { blocked: true, reason: 'Data de deploy não informada.' };

  var dateObj = parseSheetDate(dateStr);
  if (!dateObj) return { blocked: true, reason: 'Data de deploy inválida.' };

  var dayOfWeek = dateObj.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { blocked: true, reason: 'Deploys não são permitidos aos finais de semana.' };
  }
  if (dayOfWeek === 5) {
    return { blocked: true, reason: 'Deploys não são permitidos em vésperas de fim de semana (sexta-feira).' };
  }

  var formattedCheckDate = formatSheetDate(dateObj);

  try {
    var feriados = loadFeriadosForValidation(dateObj);
    for (var i = 0; i < feriados.length; i++) {
      var item = feriados[i];
      if (item.data === formattedCheckDate && item.bloqueiaDeploy) {
        return { blocked: true, reason: 'Data bloqueada devido ao feriado/ponte: ' + item.nome };
      }
    }

    var vesperaNome = findVesperaHolidayName(dateObj, feriados);
    if (vesperaNome) {
      return { blocked: true, reason: 'Data bloqueada por ser véspera do feriado: ' + vesperaNome };
    }
  } catch (e) {
    Logger.log('[ValidateDate] Erro ao consultar feriados: ' + e.toString());
  }

  return { blocked: false };
}

/**
 * Módulo Feriados & Recessos: Busca feriados aplicando HIERARQUIA ESTRITA por data:
 * Nacional (Prioridade 1) > Estadual (Prioridade 2) > Municipal (Prioridade 3)
 */
function getFeriados(targetYear) {
  try {
    var currentYear = new Date().getFullYear();
    var yearToFilter = targetYear ? parseInt(targetYear, 10) : currentYear;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return JSON.stringify({ success: false, message: 'Planilha ativa não encontrada.' });
    
    var sheets = ss.getSheets();
    var sheet = null;
    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName().trim().toLowerCase();
      if (name === 'feriados_e_pontes' || name.indexOf('feriado') !== -1) {
        sheet = sheets[i];
        break;
      }
    }

    if (!sheet) {
      return JSON.stringify({ success: false, message: 'Aba "Feriados_e_Pontes" não encontrada.' });
    }
    
    var data = sheet.getDataRange().getDisplayValues();
    if (!data || data.length <= 1) {
      return JSON.stringify({ success: true, year: yearToFilter, data: [] });
    }
    
    var rows = data.slice(1);
    var mapByDate = {};

    var pad = function(n) { return n < 10 ? '0' + n : n; };

    var formatDateStr = function(d) {
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    };

    var parseDate = function(str) {
      if (!str) return null;
      var p = str.includes('-') ? str.split('-') : str.split('/');
      if (p.length !== 3) return null;
      
      if (str.includes('-')) {
        return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
      } else {
        return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
      }
    };

    var getSpherePriority = function(esferaStr) {
      var esf = String(esferaStr || '').trim().toLowerCase();
      if (esf.indexOf('nacional') !== -1 || esf.indexOf('recesso') !== -1 || esf.indexOf('gb') !== -1) {
        return 1;
      }
      if (esf.indexOf('estadual') !== -1) {
        return 2;
      }
      return 3;
    };

    // 1. Agrupa todas as ocorrências da planilha por data
    rows.forEach(function(row) {
      if (!row || !row[0]) return;
      
      var dataStr = String(row[0] || '').trim();
      var nome = String(row[1] || 'Feriado').trim();
      var esfera = String(row[2] || 'Nacional').trim();
      var regiao = String(row[3] || 'Brasil').trim();

      var dtObj = parseDate(dataStr);
      if (!dtObj) return;

      if (dtObj.getFullYear() === yearToFilter) {
        var normalizedDateStr = formatDateStr(dtObj);
        
        if (!mapByDate[normalizedDateStr]) {
          mapByDate[normalizedDateStr] = [];
        }

        mapByDate[normalizedDateStr].push({
          rawDateStr: normalizedDateStr,
          dateObj: dtObj,
          nome: nome,
          esfera: esfera,
          regiao: regiao,
          priority: getSpherePriority(esfera)
        });
      }
    });

    var winnersByDate = {};

    Object.keys(mapByDate).forEach(function(dateKey) {
      var entries = mapByDate[dateKey];
      entries.sort(function(a, b) {
        return a.priority - b.priority;
      });
      winnersByDate[dateKey] = entries[0];
    });

    var feriadosList = [];

    Object.keys(winnersByDate).forEach(function(dateKey) {
      var winner = winnersByDate[dateKey];
      feriadosList.push({
        data: winner.rawDateStr,
        nome: winner.nome,
        esfera: winner.esfera,
        regiao: winner.regiao,
        bloqueiaDeploy: winner.priority === 1,
        tipo: 'feriado'
      });
    });

    Object.keys(winnersByDate).forEach(function(dateKey) {
      var winner = winnersByDate[dateKey];
      if (winner.priority !== 1) return;

      var dayOfWeek = winner.dateObj.getDay();
      var bridgeObj = null;
      if (dayOfWeek === 4) {
        bridgeObj = new Date(winner.dateObj.getTime());
        bridgeObj.setDate(bridgeObj.getDate() + 1);
      } else if (dayOfWeek === 2) {
        bridgeObj = new Date(winner.dateObj.getTime());
        bridgeObj.setDate(bridgeObj.getDate() - 1);
      }
      if (!bridgeObj) return;

      var bridgeStr = formatDateStr(bridgeObj);
      if (winnersByDate[bridgeStr]) return;

      var alreadyListed = false;
      for (var p = 0; p < feriadosList.length; p++) {
        if (feriadosList[p].data === bridgeStr) {
          alreadyListed = true;
          break;
        }
      }
      if (alreadyListed) return;

      feriadosList.push({
        data: bridgeStr,
        nome: 'Ponte (' + winner.nome + ')',
        esfera: 'Nacional',
        regiao: winner.regiao,
        bloqueiaDeploy: true,
        tipo: 'ponte'
      });
    });

    // 4. Ordenação cronológica final
    feriadosList.sort(function(a, b) {
      var dA = parseDate(a.data);
      var dB = parseDate(b.data);
      return dA - dB;
    });

    return JSON.stringify({
      success: true,
      year: yearToFilter,
      data: feriadosList
    });
  } catch (e) {
    Logger.log('[CalendarService] Erro ao buscar feriados: ' + e.toString());
    return JSON.stringify({ success: false, message: e.toString() });
  }
}

function normalizePlace(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[áàâã]/g, 'a')
    .replace(/[éê]/g, 'e')
    .replace(/í/g, 'i')
    .replace(/[óôõ]/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ç/g, 'c');
}

function addDays(date, days) {
  var next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function capacityParticipation(papel) {
  var role = normalizePlace(papel);
  if (role.indexOf('tech manager') !== -1) return null;
  if (role.indexOf('tech lead') !== -1) return 0.3;
  if (role.indexOf('developer') !== -1) return 1;
  return null;
}

function holidayScope(esfera) {
  var value = normalizePlace(esfera);
  if (value.indexOf('nacional') !== -1 || value.indexOf('recesso') !== -1) return 'todos';
  if (value.indexOf('estadual') !== -1) return 'estado';
  return 'cidade';
}

function sheetRows(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  var data = sheet.getDataRange().getDisplayValues();
  if (!data || data.length <= 1) return [];
  return data.slice(1);
}

function roundHours(value) {
  return Math.round(value * 100) / 100;
}

function sortedDateKeys(map) {
  return Object.keys(map).sort(function(a, b) {
    return parseSheetDate(a) - parseSheetDate(b);
  });
}

function buildCapacityCalendar(rows) {
  var nacional = {};
  var estadual = {};
  var municipal = {};

  rows.forEach(function(row) {
    var date = parseSheetDate(row[0]);
    if (!date) return;
    var key = formatSheetDate(date);
    var entry = {
      nome: String(row[1] || 'Feriado').trim(),
      regiao: normalizePlace(row[3]),
      date: date
    };
    var scope = holidayScope(row[2]);
    if (scope === 'todos') {
      if (!nacional[key]) nacional[key] = entry;
    } else if (scope === 'estado') {
      if (!estadual[key]) estadual[key] = [];
      estadual[key].push(entry);
    } else {
      if (!municipal[key]) municipal[key] = [];
      municipal[key].push(entry);
    }
  });

  var pontes = {};
  Object.keys(nacional).forEach(function(key) {
    var entry = nacional[key];
    var bridge = null;
    if (entry.date.getDay() === 4) bridge = addDays(entry.date, 1);
    if (entry.date.getDay() === 2) bridge = addDays(entry.date, -1);
    if (!bridge) return;
    var bridgeKey = formatSheetDate(bridge);
    if (nacional[bridgeKey] || pontes[bridgeKey]) return;
    pontes[bridgeKey] = 'Ponte (' + entry.nome + ')';
  });

  return { nacional: nacional, estadual: estadual, municipal: municipal, pontes: pontes };
}

function holidayForPerson(calendar, person, key) {
  if (calendar.nacional[key]) return calendar.nacional[key].nome;
  if (calendar.pontes[key]) return calendar.pontes[key];

  var list = calendar.estadual[key] || [];
  var i;
  if (person.estado) {
    for (i = 0; i < list.length; i++) {
      if (list[i].regiao === person.estado) return list[i].nome;
    }
  }

  list = calendar.municipal[key] || [];
  if (person.cidade) {
    for (i = 0; i < list.length; i++) {
      if (list[i].regiao === person.cidade) return list[i].nome;
    }
  }

  return '';
}

function personOnSustainment(shifts, email, time) {
  for (var i = 0; i < shifts.length; i++) {
    var shift = shifts[i];
    if (shift.email !== email) continue;
    if (shift.start <= time && time <= shift.end) return true;
  }
  return false;
}

/**
 * Capacidade da squad no período informado.
 * payload: { inicio: 'AAAA-MM-DD' ou 'DD/MM/AAAA', fim: idem }
 */
function getCapacity(payload) {
  try {
    var start = parseSheetDate(payload && payload.inicio);
    var end = parseSheetDate(payload && payload.fim);
    if (!start || !end) {
      return JSON.stringify({ success: false, message: 'Informe o início e o fim do período.' });
    }
    if (start.getTime() > end.getTime()) {
      return JSON.stringify({ success: false, message: 'O início do período é posterior ao fim.' });
    }

    var span = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (span > 370) {
      return JSON.stringify({ success: false, message: 'O período máximo da consulta é de 370 dias.' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return JSON.stringify({ success: false, message: 'Planilha ativa não encontrada.' });

    var people = [];
    sheetRows(ss, 'Integrantes_Squad').forEach(function(row) {
      var participation = capacityParticipation(row[3]);
      var email = String(row[2] || '').trim().toLowerCase();
      if (participation === null || !email) return;
      people.push({
        nome: String(row[1] || '').trim(),
        email: email,
        papel: String(row[3] || '').trim(),
        participacao: participation,
        ordem: parseInt(row[5], 10) || 0,
        estado: normalizePlace(row[6]),
        cidade: normalizePlace(row[7])
      });
    });

    people.sort(function(a, b) {
      if (a.participacao !== b.participacao) return b.participacao - a.participacao;
      return a.ordem - b.ordem;
    });

    var calendar = buildCapacityCalendar(sheetRows(ss, 'Feriados_e_Pontes'));

    var weeklyRituals = 0;
    sheetRows(ss, 'Rituais_e_Overhead').forEach(function(row) {
      if (normalizePlace(row[2]) !== 'sim') return;
      var hours = parseFloat(String(row[1] || '').replace(',', '.'));
      if (!isNaN(hours) && hours > 0) weeklyRituals += hours;
    });

    var absences = [];
    sheetRows(ss, 'Ausencias_e_Eventos').forEach(function(row) {
      var from = parseSheetDate(row[1]);
      var to = parseSheetDate(row[2]);
      var email = String(row[0] || '').trim().toLowerCase();
      if (!email || !from || !to) return;
      var hoursText = String(row[4] || '').trim();
      var hours = hoursText === '' ? null : parseFloat(hoursText.replace(',', '.'));
      if (hours !== null && (isNaN(hours) || hours < 0)) hours = null;
      absences.push({ email: email, start: from.getTime(), end: to.getTime(), hours: hours });
    });

    var shifts = [];
    sheetRows(ss, 'Escala_Sustentacao').forEach(function(row) {
      var from = parseSheetDate(row[3]);
      var to = parseSheetDate(row[4]);
      var email = String(row[1] || '').trim().toLowerCase();
      if (!email || !from || !to) return;
      shifts.push({ email: email, start: from.getTime(), end: to.getTime() });
    });

    var jornada = 7.5;
    var total = 0;
    var rituaisPeriodo = 0;
    var months = {};
    var monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);
    var monthEnd = new Date(end.getFullYear(), end.getMonth(), 1);
    while (monthCursor.getTime() <= monthEnd.getTime()) {
      months[monthCursor.getFullYear() + '-' + pad2(monthCursor.getMonth() + 1)] = 0;
      monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
    }

    people.forEach(function(person) {
      var entrega = 0;
      var diasEntrega = 0;
      var dayHours = {};

      var cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      while (cursor.getTime() <= end.getTime()) {
        var dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) {
          var key = formatSheetDate(cursor);
          if (!holidayForPerson(calendar, person, key)) {
            dayHours[key] = jornada;
          }
        }
        cursor = addDays(cursor, 1);
      }

      absences.forEach(function(item) {
        if (item.email !== person.email) return;
        var keys = sortedDateKeys(dayHours);
        if (item.hours === null) {
          keys.forEach(function(key) {
            var day = parseSheetDate(key);
            if (!day) return;
            var time = day.getTime();
            if (time < item.start || time > item.end) return;
            dayHours[key] = 0;
          });
          return;
        }

        var remaining = item.hours;
        keys.forEach(function(key) {
          if (remaining <= 0) return;
          var day = parseSheetDate(key);
          if (!day) return;
          var time = day.getTime();
          if (time < item.start || time > item.end) return;
          var cut = Math.min(dayHours[key], remaining);
          dayHours[key] -= cut;
          remaining -= cut;
        });
      });

      sortedDateKeys(dayHours).forEach(function(key) {
        var day = parseSheetDate(key);
        if (!day || dayHours[key] <= 0) return;
        if (personOnSustainment(shifts, person.email, day.getTime())) {
          dayHours[key] = 0;
          return;
        }
        entrega += dayHours[key];
        diasEntrega += 1;
      });

      var rituais = weeklyRituals * diasEntrega / 5;
      var efetivas = person.participacao * Math.max(0, entrega - rituais);
      total += efetivas;
      rituaisPeriodo += person.participacao * Math.min(rituais, entrega);

      if (efetivas <= 0 || entrega <= 0) return;
      sortedDateKeys(dayHours).forEach(function(key) {
        if (dayHours[key] <= 0) return;
        var day = parseSheetDate(key);
        if (!day) return;
        var monthKey = day.getFullYear() + '-' + pad2(day.getMonth() + 1);
        if (months[monthKey] === undefined) return;
        months[monthKey] += efetivas * (dayHours[key] / entrega);
      });
    });

    var monthKeys = Object.keys(months).sort();
    var serie = [];
    var acumulado = 0;
    var assigned = 0;
    monthKeys.forEach(function(key, index) {
      var horas = roundHours(months[key]);
      if (index === monthKeys.length - 1) horas = roundHours(total - assigned);
      assigned += horas;
      acumulado = roundHours(acumulado + horas);
      serie.push({ mes: key, horas: horas, acumulado: acumulado });
    });

    return JSON.stringify({
      success: true,
      inicio: formatSheetDate(start),
      fim: formatSheetDate(end),
      jornada: jornada,
      total: roundHours(total),
      rituais: roundHours(rituaisPeriodo),
      meses: serie
    });
  } catch (e) {
    Logger.log('[Capacity] ' + e.toString());
    return JSON.stringify({ success: false, message: e.toString() });
  }
}

function throughputRules() {
  return {
    boardId: 335,
    cancelColumns: { '80228': true, '124129': true, '139956': true },
    includedTypes: { story: true, 'technical story': true },
    historyMonths: 6,
    trials: 10000,
    cacheSeconds: 21600,
    pageCap: 20
  };
}

function shiftMonth(year, month, delta) {
  var index = year * 12 + (month - 1) + delta;
  var shiftedYear = Math.floor(index / 12);
  var shiftedMonth = index % 12;
  if (shiftedMonth < 0) {
    shiftedMonth += 12;
    shiftedYear -= 1;
  }
  return { year: shiftedYear, month: shiftedMonth + 1 };
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function closedThroughputWindow(now) {
  var rules = throughputRules();
  var stamp = Utilities.formatDate(now || new Date(), 'America/Sao_Paulo', 'yyyy-MM');
  var parts = stamp.split('-');
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  var start = shiftMonth(year, month, -rules.historyMonths);
  var end = shiftMonth(year, month, -1);
  var keys = [];
  var cursor = start;
  while (cursor.year < end.year || (cursor.year === end.year && cursor.month <= end.month)) {
    keys.push(cursor.year + '-' + pad2(cursor.month));
    cursor = shiftMonth(cursor.year, cursor.month, 1);
  }
  return {
    from: start.year + '-' + pad2(start.month) + '-01',
    to: end.year + '-' + pad2(end.month) + '-' + pad2(daysInMonth(end.year, end.month)),
    keys: keys
  };
}

function horizonMonths(start, end) {
  var count = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return count < 1 ? 1 : count;
}

function periodUsesFullMonths(start, end) {
  if (start.getDate() !== 1) return false;
  var lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  return end.getDate() === lastDay;
}

function businessmapConfig() {
  var props = PropertiesService.getScriptProperties();
  var base = String(props.getProperty('BUSINESSMAP_BASE_URL') || '').trim().replace(/\/+$/, '');
  var key = String(props.getProperty('BUSINESSMAP_API_KEY') || '').trim();
  if (!base || !key) return null;
  if (!/\/api\/v2$/i.test(base)) base += '/api/v2';
  return { base: base, key: key };
}

function businessmapGet(config, path, query) {
  var url = config.base + path + (query ? '?' + query : '');
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      apikey: config.key,
      Accept: 'application/json'
    }
  });
  var code = response.getResponseCode();
  var parsed = {};
  try {
    parsed = JSON.parse(response.getContentText() || '{}');
  } catch (e) {
    parsed = {};
  }
  if (code < 200 || code >= 300) {
    var detail = parsed.error && parsed.error.message
      ? parsed.error.message
      : 'resposta sem detalhe';
    var failure = new Error('HTTP ' + code + ' em ' + path + ': ' + detail);
    failure.code = code;
    throw failure;
  }
  return parsed;
}

function businessmapRows(payload) {
  if (!payload || !payload.data) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

function typeIdsFromPayload(payload) {
  var rules = throughputRules();
  var ids = {};
  var found = {};
  businessmapRows(payload).forEach(function(row) {
    var name = normalizePlace(row.name || row.type_name || '');
    if (!rules.includedTypes[name]) return;
    ids[String(row.type_id)] = true;
    found[name] = true;
  });
  if (!found.story || !found['technical story']) return null;
  return ids;
}

function includedThroughputTypeIds(config) {
  var rules = throughputRules();
  var paths = ['/boards/' + rules.boardId + '/cardTypes', '/cardTypes'];
  var i;
  for (i = 0; i < paths.length; i++) {
    try {
      var ids = typeIdsFromPayload(businessmapGet(config, paths[i], ''));
      if (ids) return ids;
      Logger.log('[Throughput] ' + paths[i] + ' sem Story e Technical Story pelo nome.');
    } catch (e) {
      if (e.code !== 404) throw e;
      Logger.log('[Throughput] ' + e.message);
    }
  }
  return { '1': true, '12': true };
}

function monthKeyFromTimestamp(value) {
  if (!value) return '';
  var text = String(value).trim();
  var date = new Date(text);
  if (isNaN(date.getTime())) date = new Date(text.replace(' ', 'T'));
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, 'America/Sao_Paulo', 'yyyy-MM');
}

function isCancelledThroughputCard(card) {
  var rules = throughputRules();
  var current = String(card.column_id || '');
  var last = String(card.last_column_id || '');
  return !!(rules.cancelColumns[current] || rules.cancelColumns[last]);
}

function listCompletedCards(config, state, fromDate, toDate) {
  var rules = throughputRules();
  var cards = [];
  var page = 1;
  var allPages = 1;
  while (page <= allPages) {
    if (page > rules.pageCap) {
      throw new Error('O histórico de cards passou do limite de páginas da consulta.');
    }
    var query = [
      'board_ids=' + rules.boardId,
      'state=' + encodeURIComponent(state),
      'first_end_from=' + encodeURIComponent(fromDate + ' 00:00:00'),
      'first_end_to=' + encodeURIComponent(toDate + ' 23:59:59'),
      'fields=' + encodeURIComponent('card_id,type_id,column_id,last_column_id,first_end_time'),
      'per_page=1000',
      'page=' + page
    ].join('&');
    var payload = businessmapGet(config, '/cards', query);
    var block = payload.data || {};
    cards = cards.concat(businessmapRows(payload));
    allPages = block.pagination && block.pagination.all_pages ? block.pagination.all_pages : 1;
    page++;
  }
  return cards;
}

function loadThroughputHistory() {
  var rules = throughputRules();
  var window = closedThroughputWindow(new Date());
  var cache = CacheService.getScriptCache();
  var cacheKey = 'vdcore-tp-story-' + rules.boardId + '-' + window.keys[0] + '-' + window.keys[window.keys.length - 1];
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.historico && parsed.historico.length === window.keys.length) return parsed;
    } catch (e) {
      cached = null;
    }
  }

  var config = businessmapConfig();
  if (!config) {
    throw new Error('Configure BUSINESSMAP_BASE_URL e BUSINESSMAP_API_KEY nas Script Properties.');
  }

  var includedTypes = includedThroughputTypeIds(config);
  var counts = {};
  window.keys.forEach(function(key) { counts[key] = 0; });

  var fetched = 0;
  var counted = 0;
  ['active', 'archived'].forEach(function(state) {
    listCompletedCards(config, state, window.from, window.to).forEach(function(card) {
      fetched += 1;
      if (!includedTypes[String(card.type_id)]) return;
      if (isCancelledThroughputCard(card)) return;
      var month = monthKeyFromTimestamp(card.first_end_time);
      if (counts[month] === undefined) return;
      counts[month] += 1;
      counted += 1;
    });
  });
  Logger.log('[Throughput] lidos=' + fetched + ' contados=' + counted);

  var history = window.keys.map(function(key) {
    return { mes: key, cards: counts[key] };
  });
  var stored = {
    from: window.from,
    to: window.to,
    historico: history
  };
  cache.put(cacheKey, JSON.stringify(stored), rules.cacheSeconds);
  return stored;
}

function throughputPercentile(sorted, percent) {
  var index = Math.ceil(percent / 100 * sorted.length) - 1;
  if (index < 0) index = 0;
  if (index >= sorted.length) index = sorted.length - 1;
  return sorted[index];
}

function simulateThroughput(samples, horizon) {
  var trials = throughputRules().trials;
  var results = [];
  var trial;
  var month;
  var sum;
  for (trial = 0; trial < trials; trial++) {
    sum = 0;
    for (month = 0; month < horizon; month++) {
      sum += samples[Math.floor(Math.random() * samples.length)];
    }
    results.push(sum);
  }
  results.sort(function(a, b) { return a - b; });
  return {
    peloMenos: throughputPercentile(results, 15),
    mediana: throughputPercentile(results, 50),
    teto: throughputPercentile(results, 85)
  };
}

/**
 * Previsão de cards para o horizonte do período.
 * O histórico é fixo: seis meses fechados anteriores ao mês corrente.
 * payload: { inicio, fim } no mesmo formato de getCapacity.
 */
function getThroughputForecast(payload) {
  try {
    var start = parseSheetDate(payload && payload.inicio);
    var end = parseSheetDate(payload && payload.fim);
    if (!start || !end) {
      return JSON.stringify({ success: false, message: 'Informe o início e o fim do período.' });
    }
    if (start.getTime() > end.getTime()) {
      return JSON.stringify({ success: false, message: 'O início do período é posterior ao fim.' });
    }

    var history = loadThroughputHistory();
    var samples = history.historico.map(function(item) { return item.cards; });
    if (!samples.length) {
      return JSON.stringify({ success: false, message: 'O histórico de entrega veio vazio.' });
    }
    var horizon = horizonMonths(start, end);
    var forecast = simulateThroughput(samples, horizon);

    return JSON.stringify({
      success: true,
      horizonteMeses: horizon,
      mesesCheios: periodUsesFullMonths(start, end),
      peloMenos: forecast.peloMenos,
      mediana: forecast.mediana,
      teto: forecast.teto,
      historico: history.historico,
      historicoInicio: history.historico[0].mes,
      historicoFim: history.historico[history.historico.length - 1].mes,
      simulacoes: throughputRules().trials,
      recorte: 'VD Plataforma Core · somente Story e Technical Story, sem cancelados'
    });
  } catch (e) {
    Logger.log('[Throughput] ' + e.toString());
    return JSON.stringify({ success: false, message: e.message || e.toString() });
  }
}