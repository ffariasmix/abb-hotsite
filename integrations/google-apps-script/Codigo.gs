/**
 * ABB Hotsite — Receptor de Feedback (Google Apps Script)
 * =======================================================
 * Recebe o feedback enviado pelo formulário do Hotsite e, para cada envio:
 *   1. Salva os anexos numa pasta do seu Google Drive;
 *   2. Registra uma linha na planilha (aba "Feedback");
 *   3. Envia um e-mail para a equipe.
 *
 * Tudo roda na SUA conta Google — sem servidor, sem custo, sem terceiros.
 *
 * COMO INSTALAR (passo a passo em site/integrations/google-apps-script/README.md):
 *   1. Crie uma Planilha Google nova.
 *   2. Menu Extensões → Apps Script.
 *   3. Apague o conteúdo e cole ESTE arquivo inteiro.
 *   4. Implantar → Nova implantação → tipo "App da Web".
 *        Executar como: EU  |  Quem pode acessar: QUALQUER PESSOA.
 *   5. Copie a URL do app da Web e cole em site/app.js (APPS_SCRIPT_URL).
 */

// Quem recebe o e-mail a cada novo feedback (separar por vírgula):
var EMAILS = 'fernandofarias@bb.com.br,sedudu@bb.com.br,fernando.sfarias@hotmail.com';

// Nome da pasta (no seu Drive) onde os anexos são guardados:
var PASTA_ANEXOS = 'ABB Feedback - Anexos';

// Nome da aba da planilha onde as respostas são registradas:
var ABA = 'Feedback';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ── Planilha ──────────────────────────────────────────────
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(ABA) || ss.insertSheet(ABA);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Data', 'Tipo', 'Título', 'Detalhes', 'Avaliação', 'Anexos']);
    }

    // ── Anexos → Drive ────────────────────────────────────────
    var links = [];
    var files = data.files || [];
    if (files.length) {
      var folder = getFolder_(PASTA_ANEXOS);
      files.forEach(function (f) {
        if (!f || !f.dataBase64) return;
        var bytes = Utilities.base64Decode(f.dataBase64);
        var blob = Utilities.newBlob(bytes, f.mime || 'application/octet-stream', f.name || 'anexo');
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        links.push((f.name || 'anexo') + ': ' + file.getUrl());
      });
    }

    var quando = data.data || new Date().toLocaleString('pt-BR');
    sheet.appendRow([
      quando,
      data.tipo || '',
      data.titulo || '',
      data.detalhes || '(não informado)',
      data.avaliacao || '',
      links.join('\n'),
    ]);

    // ── E-mail ────────────────────────────────────────────────
    var corpo =
      'Novo feedback do Hotsite ABB\n' +
      '──────────────────────────────────────\n' +
      'Tipo:      ' + (data.tipo || '') + '\n' +
      'Avaliação: ' + (data.avaliacao || '') + '\n' +
      'Data:      ' + quando + '\n' +
      '──────────────────────────────────────\n\n' +
      'TÍTULO:\n' + (data.titulo || '') + '\n\n' +
      'DETALHES:\n' + (data.detalhes || '(não informado)') + '\n\n' +
      'ANEXOS:\n' + (links.length ? links.join('\n') : '(nenhum)') + '\n';
    MailApp.sendEmail({
      to: EMAILS,
      subject: '[ABB Beta] ' + (data.tipo || 'Feedback') + ': ' + (data.titulo || ''),
      body: corpo,
    });

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Teste rápido no navegador: abrir a URL do app deve mostrar esta mensagem.
function doGet() {
  return ContentService.createTextOutput('ABB Feedback endpoint ativo.');
}

function getFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
