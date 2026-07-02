/* ABB Hotsite — feedback form + smooth scroll.
   Recreated from the DCLogic component in project/ABB Hotsite.dc.html. */
(() => {
  'use strict';

  // ── Feedback delivery ───────────────────────────────────────────
  // Primary path: POST the feedback (with attachments as base64) to a
  // Google Apps Script web app running in your own Google account. It
  // saves attachments to your Drive, logs a row in a Google Sheet, and
  // emails the team. See integrations/google-apps-script/README.md to
  // set it up, then paste the "app da Web" URL below.
  //   e.g. 'https://script.google.com/macros/s/AKfy..../exec'
  const APPS_SCRIPT_URL = ''; // <-- SET THIS before go-live

  // Fallback (used only while APPS_SCRIPT_URL is empty): open the user's
  // mail client addressed to the distribution list below.
  const FEEDBACK_TO = [
    'fernandofarias@bb.com.br',
    'sedudu@bb.com.br',
    'fernando.sfarias@hotmail.com',
  ].join(',');

  const TYPE_LABELS = {
    bug: 'Algo quebrou',
    melhoria: 'Pode melhorar',
    sugestao: 'Tive uma ideia',
    elogio: 'Quero elogiar',
  };
  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file

  const state = { type: 'bug', rating: 0, files: [] };

  const $ = (sel) => document.querySelector(sel);

  // ── Smooth scroll to the feedback section ───────────────────────
  const scrollToFeedback = () => {
    const el = document.getElementById('feedback-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };
  document.querySelectorAll('[data-scroll-feedback]').forEach((b) =>
    b.addEventListener('click', scrollToFeedback));

  // ── Type selector ───────────────────────────────────────────────
  const typeRow = $('#type-row');
  typeRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.type-btn');
    if (!btn) return;
    state.type = btn.dataset.type;
    typeRow.querySelectorAll('.type-btn').forEach((b) =>
      b.classList.toggle('active', b === btn));
  });

  // ── Star rating ─────────────────────────────────────────────────
  const starRow = $('#star-row');
  const renderStars = () => {
    starRow.querySelectorAll('.star-btn').forEach((b) => {
      const n = Number(b.dataset.star);
      const on = n <= state.rating;
      b.textContent = on ? '★' : '☆';
      b.classList.toggle('active', on);
    });
    refreshSubmit();
  };
  starRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.star-btn');
    if (!btn) return;
    state.rating = Number(btn.dataset.star);
    renderStars();
  });

  // ── Title (gates submit) ────────────────────────────────────────
  const titleInput = $('#fb-title');
  const descInput = $('#fb-desc');
  titleInput.addEventListener('input', refreshSubmit);

  // ── File attachments ────────────────────────────────────────────
  const fileInput = $('#fb-files');
  const fileList = $('#file-list');
  const iconFor = (f) =>
    f.type.startsWith('image/') ? '🖼️'
    : f.type.startsWith('video/') ? '🎥'
    : f.name.toLowerCase().endsWith('.pdf') ? '📄'
    : '📎';
  const humanSize = (bytes) =>
    bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB'
    : Math.round(bytes / 1024) + ' KB';

  const renderFiles = () => {
    fileList.innerHTML = '';
    state.files.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML =
        '<span style="font-size:16px;">' + f.icon + '</span>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:12.5px;color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>' +
          '<div style="font-size:10.5px;color:rgba(255,255,255,0.35);margin-top:1px;">' + f.size + '</div>' +
        '</div>' +
        '<button class="file-remove" aria-label="Remover">×</button>';
      row.querySelector('div > div').textContent = f.name; // safe text insert
      row.querySelector('.file-remove').addEventListener('click', () => {
        state.files.splice(i, 1);
        renderFiles();
      });
      fileList.appendChild(row);
    });
  };

  fileInput.addEventListener('change', (e) => {
    [...(e.target.files || [])].forEach((f) => {
      if (f.size > MAX_FILE_BYTES) {
        alert('"' + f.name + '" excede 10 MB e não foi anexado.');
        return;
      }
      state.files.push({ file: f, name: f.name, size: humanSize(f.size), icon: iconFor(f) });
    });
    fileInput.value = '';
    renderFiles();
  });

  // ── Submit gating ───────────────────────────────────────────────
  const submitBtn = $('#submit-feedback');
  function canSubmit() {
    return titleInput.value.trim().length > 2 && state.rating > 0;
  }
  function refreshSubmit() {
    submitBtn.classList.toggle('enabled', canSubmit());
  }

  // ── Submit ──────────────────────────────────────────────────────
  submitBtn.addEventListener('click', async () => {
    if (!canSubmit() || submitBtn.dataset.busy === '1') return;
    const title = titleInput.value.trim();
    const desc = descInput.value.trim();
    const rating = state.rating;
    const typeLabel = TYPE_LABELS[state.type];
    const fileNames = state.files.map((f) => f.name).join(', ');

    // Persist locally (feeds the Control Center triage in the full product).
    try {
      const entry = {
        type: state.type, title, desc, rating,
        ts: new Date().toISOString(), files: fileNames,
      };
      const prev = JSON.parse(localStorage.getItem('abb_feedback') || '[]');
      prev.push(entry);
      localStorage.setItem('abb_feedback', JSON.stringify(prev));
    } catch (_) { /* storage may be unavailable — non-fatal */ }

    // Primary: POST JSON (with base64 attachments) to the Apps Script app.
    if (APPS_SCRIPT_URL) {
      setBusy(true);
      try {
        const files = await Promise.all(state.files.map(readAsPayload));
        const payload = {
          tipo: typeLabel,
          titulo: title,
          detalhes: desc || '(não informado)',
          avaliacao: rating + '/5',
          data: new Date().toLocaleString('pt-BR'),
          origem: 'Hotsite ABB · App BB 5.0',
          files,
        };
        // 'no-cors' + text/plain body avoids the CORS preflight that Apps
        // Script web apps don't answer. The response is opaque, so we treat
        // a resolved fetch as success (the row + email happen server-side;
        // localStorage above is the local backup).
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
        showSuccess();
      } catch (err) {
        alert('Não foi possível enviar agora. Verifique sua conexão e tente novamente.');
        console.warn('feedback submit failed:', err);
      } finally {
        setBusy(false);
      }
      return;
    }

    // Fallback (endpoint not configured yet): open the mail client.
    const sep = '─'.repeat(38);
    const starsStr = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const subject = encodeURIComponent('[ABB Beta] ' + typeLabel + ': ' + title);
    const body = encodeURIComponent(
      'FEEDBACK ABB: BETA TESTER\n' + sep + '\n' +
      'Tipo:      ' + typeLabel + '\n' +
      'Avaliação: ' + starsStr + '\n' +
      'Data:      ' + new Date().toLocaleString('pt-BR') + '\n' + sep + '\n\n' +
      'TÍTULO:\n' + title + '\n\n' +
      'DETALHES:\n' + (desc || '(não informado)') + '\n\n' +
      'ANEXOS:\n' + (fileNames || '(nenhum)') + '\n\n' +
      sep + '\nHotsite ABB · App BB 5.0'
    );
    window.location.href = 'mailto:' + FEEDBACK_TO + '?subject=' + subject + '&body=' + body;
    showSuccess();
  });

  function setBusy(on) {
    submitBtn.dataset.busy = on ? '1' : '';
    submitBtn.textContent = on ? 'Enviando…' : 'Contribuir com o projeto →';
  }

  // Read an attachment as { name, mime, dataBase64 } for the JSON payload.
  function readAsPayload(f) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result);
        const base64 = s.slice(s.indexOf(',') + 1); // strip "data:...;base64,"
        resolve({ name: f.name, mime: f.file.type || 'application/octet-stream', dataBase64: base64 });
      };
      r.onerror = () => reject(r.error);
      r.readAsDataURL(f.file);
    });
  }

  // ── Success / reset ─────────────────────────────────────────────
  function showSuccess() {
    $('#feedback-form').style.display = 'none';
    $('#feedback-success').style.display = 'block';
  }
  $('#reset-feedback').addEventListener('click', () => {
    state.type = 'bug';
    state.rating = 0;
    state.files = [];
    titleInput.value = '';
    descInput.value = '';
    typeRow.querySelectorAll('.type-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.type === 'bug'));
    renderStars();
    renderFiles();
    refreshSubmit();
    $('#feedback-success').style.display = 'none';
    $('#feedback-form').style.display = 'block';
  });

  // initial paint
  renderStars();
  refreshSubmit();
})();
