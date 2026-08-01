/* =====================================================================
 * 工具分析模組  (Tools Analysis)  v1.0
 * for Micro-politics 班級微政治事件管理系統
 * ---------------------------------------------------------------------
 * 用多種框架拆解事件：冰山模型、4F、SMART、艾森豪矩陣、導航雙矩陣，
 * 並可一鍵產生 O3 一對一對話腳本。
 *
 * 擷取自 principal-assistant 的「工具分析」功能，
 * 改用本 App 既有的 window.callGemini(prompt, maxTokens) 呼叫 AI（免第三方金鑰設定）。
 *
 * 安裝：把本檔放到 repo，於 index.html 的 </body> 前加：
 *   <script src="tools-analysis.js"></script>
 * ===================================================================== */
(function () {
  'use strict';
  if (window.__toolsAnalysisLoaded) return;
  window.__toolsAnalysisLoaded = true;

  /* ---------- 五個分析工具（含系統提示） ---------- */
  var TOOLS = [
    { id: 'iceberg', name: '🧊 冰山模型（行為－結構－信念）', sys: '你是組織溝通顧問。請用「冰山模型」分析以下事件中的關鍵關係人，分三層：\n① 現象／行為層：對方的觀點與抱怨。\n② 結構／情緒層：對方的感受與期待。\n③ 信念／需求層：行為背後最深層的渴望。\n最後給 1-2 個溝通策略。繁體中文、分層條列。' },
    { id: 'f4', name: '🪜 4F 深度反思階梯', sys: '你是反思引導教練。請用「4F」分析：Fact 客觀事實、Feeling 情緒感受、Finding 發現與學習、Future 未來行動。四段清楚，繁體中文。' },
    { id: 'smart', name: '🎯 SMART 目標對焦', sys: '你是目標管理顧問。請把以下事件轉成 SMART 目標：Specific 具體、Measurable 衡量、Achievable 可達成、Relevant 相關、Time-bound 時限。最後給第一步行動。繁體中文、條列。' },
    { id: 'eisen', name: '⏱️ 艾森豪矩陣（重要 × 緊急）', sys: '你是時間管理顧問。請用「艾森豪矩陣」分析以下校園事件：把其中的待辦與議題，依「重要程度 × 緊急程度」分入四象限並條列：\n① 重要且緊急＝危機處理（立即做）\n② 重要不緊急＝規劃與成長（排時間做）\n③ 不重要但緊急＝干擾瑣事（授權或減少）\n④ 不重要不緊急＝浪費時間（放棄）\n最後給一句行動重點。繁體中文、條列清楚。' },
    { id: 'dual', name: '🧭 導航雙矩陣（時間＋影響力）', sys: '你是校務策略顧問。請用「導航雙矩陣」分析以下事件，分兩部分：\n(一) 艾森豪矩陣（重要 × 緊急）：四象限條列。\n(二) IF 矩陣（影響力 × 可行性）：快速贏家、長期抗戰、碎片處理、放下它。\n結論給一個最優先行動。繁體中文。' }
  ];

  var O3_SYS = '你是學校校長的一對一溝通教練，精通 NVC（非暴力溝通）與 O3 深度對話框架（觀察 Observation、感受 Feeling、需要 Need、請求 Request）。\n請根據以下事件，幫校長撰寫一份「O3 一對一對話腳本」，分四段：\n\n【O1 觀察（Observation）】\n- 不帶評判，描述雙方都能接受的客觀事實（用「我看到／我注意到」句型）\n- 範例：「我注意到這學期你提交週報的時間比較晚…」\n\n【O2 感受（Feeling）】\n- 表達校長自身的情緒連結（用「我感到…」，而非「你讓我…」）\n- 範例：「我感到有些擔心，因為我不確定你是否遇到什麼困難…」\n\n【O3 需要（Need）】\n- 說出內心重視的核心價值或需求\n- 範例：「因為我很重視團隊的互信與透明，也希望你在這裡感到被支持…」\n\n【O4 請求（Request）】\n- 提出具體、可拒絕的請求（非命令）\n- 範例：「你願意現在花 10 分鐘告訴我，最近遇到的最大挑戰是什麼嗎？」\n\n最後加一段「提醒校長」：傾聽對方回應，把「你訊息（指責）」換成「我訊息（連結）」。\n繁體中文、格式清楚、可直接拿去對話。';

  /* ---------- AI 呼叫：沿用 App 既有的 window.callGemini ---------- */
  function analyze(sys, content, cb, errcb) {
    if (typeof window.callGemini !== 'function') { return errcb('找不到 callGemini（請在 App 內執行）'); }
    var prompt = sys + '\n\n事件：\n' + content + '\n\n請直接輸出，不要加開場白。';
    window.callGemini(prompt, 8192).then(function (t) {
      t = (t || '').trim();
      if (!t) return errcb('AI 回應為空（請確認已在「設定」填入 Gemini API Key）');
      cb(t);
    }).catch(function (e) {
      errcb('AI 分析失敗：' + (e && e.message ? e.message : e) + '（請到「設定」確認 Gemini API Key）');
    });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mdBold(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^#+\s?(.*)$/gm, '<b>$1</b>'); }

  var modal = null;
  var EVENTS = [];
  var IS = 'width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box';
  var BS = 'width:100%;padding:12px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px';
  function fld(l, inner) { return '<div style="margin-bottom:12px"><div style="font-size:12px;color:#6b7280;font-weight:600;margin-bottom:4px">' + l + '</div>' + inner + '</div>'; }
  function toolOpts() { return TOOLS.map(function (t) { return '<option value="' + t.id + '">' + t.name + '</option>'; }).join(''); }

  /* 把單一事件（含既有校長三層建議）組成分析用內容 */
  function eventToContent(e) {
    var parts = ['事件描述：' + (e.desc || '')];
    if (e.students) parts.push('主述人物：' + e.students);
    if (e.teacher) parts.push('導師：' + e.teacher);
    var t = e.created_at || e.time; if (t) parts.push('時間：' + t);
    if (e.severity) parts.push('嚴重性：' + e.severity);
    if (e.category) parts.push('分類：' + e.category);
    var adv = [];
    if (e.teacherAdvice) adv.push('→ 訓導組長：' + e.teacherAdvice);
    if (e.aiAnalysis) adv.push('→ 導師：' + e.aiAnalysis);
    if (e.principalToTeacher) adv.push('→ 學生：' + e.principalToTeacher);
    if (e.principalToStudent) adv.push('→ 系統備註：' + e.principalToStudent);
    if (adv.length) { parts.push(''); parts.push('【既有校長三層建議（供參考）】'); parts = parts.concat(adv); }
    return parts.join('\n');
  }

  /* 載入雲端歷史事件，填入下拉選單（沿用 App 既有的 window._fbEvents） */
  function loadEventOptions() {
    var sel = modal && modal.querySelector('#tlEvent');
    if (!sel || typeof window._fbEvents !== 'function') return;
    window._fbEvents().then(function (evs) {
      EVENTS = Array.isArray(evs) ? evs : [];
      var opts = '<option value="">— 直接輸入，或選一筆歷史事件帶入 —</option>';
      EVENTS.slice().reverse().forEach(function (e) {
        var realIdx = EVENTS.indexOf(e);
        var d = String(e.created_at || e.time || '').slice(0, 16);
        var who = (e.students || '—');
        var desc = (e.desc || '').slice(0, 18);
        opts += '<option value="' + realIdx + '">' + esc((d ? d + '｜' : '') + who + '｜' + desc) + '</option>';
      });
      if (modal && modal.querySelector('#tlEvent')) modal.querySelector('#tlEvent').innerHTML = opts;
    }).catch(function () {});
  }

  function buildModal() {
    modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.55);display:none;align-items:stretch;justify-content:center;padding:0';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;width:100%;max-width:820px;height:100%;display:flex;flex-direction:column;overflow:hidden;font-family:system-ui,"Noto Sans TC",sans-serif';
    box.innerHTML = '<div style="background:#0f766e;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:8px"><span style="font-size:18px;font-weight:700;flex:1">🧰 工具分析</span><button id="tlClose" style="background:rgba(255,255,255,.2);border:none;color:#fff;font-size:16px;width:30px;height:30px;border-radius:50%;cursor:pointer">✕</button></div>'
      + '<div id="tlBody" style="padding:16px;padding-bottom:max(24px,env(safe-area-inset-bottom));overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1"></div>';
    modal.appendChild(box);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.body.appendChild(modal);
    box.querySelector('#tlClose').onclick = closeModal;
    paint();
  }
  function closeModal() { if (modal) modal.style.display = 'none'; }

  function paint() {
    var body = modal.querySelector('#tlBody');
    body.innerHTML = fld('選擇分析工具', '<select id="tlTool" style="' + IS + '">' + toolOpts() + '</select>')
      + fld('從歷史事件帶入（選填）', '<select id="tlEvent" style="' + IS + '"><option value="">載入雲端事件中…</option></select>')
      + fld('事件內容', '<textarea id="tlContent" rows="5" placeholder="描述要分析的事件或情況，例：資深老師抱怨又要弄新計畫、增加負擔…" style="' + IS + ';resize:vertical"></textarea>')
      + '<button id="tlRun" style="' + BS + '">🔍 用 AI 分析（分析完自動接 O3 對話）</button>'
      + '<div id="tlResult" style="margin-top:14px"></div>'
      + '<div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px">'
      + '<button id="tlRecordsToggle" style="width:100%;padding:9px;background:#f0fdfa;color:#0f766e;border:1px solid #99f6e4;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">📚 已存分析紀錄</button>'
      + '<div id="tlRecords" style="margin-top:10px;display:none"></div>'
      + '</div>';
    body.querySelector('#tlRun').onclick = run;
    body.querySelector('#tlRecordsToggle').onclick = function () {
      var box = modal.querySelector('#tlRecords');
      if (box.style.display === 'none') { box.style.display = 'block'; loadRecords(); }
      else { box.style.display = 'none'; }
    };
    var evSel = body.querySelector('#tlEvent');
    evSel.onchange = function () {
      if (evSel.value === '') return;
      var e = EVENTS[+evSel.value];
      if (e) body.querySelector('#tlContent').value = eventToContent(e);
    };
    loadEventOptions();
  }

  function run() {
    var body = modal.querySelector('#tlBody');
    var toolId = body.querySelector('#tlTool').value, content = body.querySelector('#tlContent').value.trim();
    var out = body.querySelector('#tlResult');
    if (!content) { out.innerHTML = '<div style="color:#ef4444;font-size:13px">請先輸入事件內容</div>'; return; }
    var tool = TOOLS.filter(function (t) { return t.id === toolId; })[0];
    out.innerHTML = '<div style="color:#6b7280;font-size:13px">AI 分析中…（' + esc(tool.name) + '）</div>';
    analyze(tool.sys, content, function (t) {
      out.innerHTML = '<div style="border:1px solid #99f6e4;background:#f0fdfa;border-radius:10px;padding:14px">'
        + '<div style="font-size:12px;font-weight:700;color:#0f766e;margin-bottom:8px">' + esc(tool.name) + '　分析結果</div>'
        + '<div style="font-size:14px;line-height:1.7;color:#134e4a;white-space:pre-wrap">' + mdBold(t) + '</div></div>'
        + '<div style="display:flex;gap:8px;margin-top:10px">'
        + '<button id="tlCopy" style="flex:1;padding:8px 14px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">📋 複製分析結果</button>'
        + '<button id="tlO3" style="flex:1;padding:8px 14px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">🗣️ 產生 O3 對話腳本</button>'
        + '</div>'
        + '<div id="tlO3Result" style="margin-top:14px"></div>';
      out.querySelector('#tlCopy').onclick = function () { try { navigator.clipboard.writeText(t); this.textContent = '✓ 已複製'; } catch (e) {} };
      var savedContent = content;
      var o3Btn = out.querySelector('#tlO3');
      var ctx = { tool: tool.name, analysis: t };
      o3Btn.onclick = function () { runO3(savedContent, out.querySelector('#tlO3Result'), this, ctx); };
      // 分析完立刻自動接 O3 對話系統（不需再手動點）
      runO3(savedContent, out.querySelector('#tlO3Result'), o3Btn, ctx);
    }, function (e) { out.innerHTML = '<div style="color:#ef4444;font-size:13px">' + esc(e) + '</div>'; });
  }

  function runO3(content, outEl, btn, ctx) {
    ctx = ctx || {};
    btn.textContent = '產生中…'; btn.disabled = true;
    outEl.innerHTML = '<div style="color:#6b7280;font-size:13px">O3 腳本產生中…</div>';
    analyze(O3_SYS, content, function (t) {
      outEl.innerHTML = '<div style="border:1px solid #ddd6fe;background:#faf5ff;border-radius:10px;padding:14px">'
        + '<div style="font-size:12px;font-weight:700;color:#7c3aed;margin-bottom:8px">🗣️ O3 一對一對話腳本</div>'
        + '<div style="font-size:14px;line-height:1.8;color:#3b0764;white-space:pre-wrap">' + mdBold(t) + '</div></div>'
        + '<div style="display:flex;gap:8px;margin-top:8px">'
        + '<button id="tlO3Copy" style="flex:1;padding:8px 14px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">📋 複製對話腳本</button>'
        + '<button id="tlSave" style="flex:1;padding:8px 14px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">💾 儲存為紀錄</button>'
        + '</div>';
      outEl.querySelector('#tlO3Copy').onclick = function () { try { navigator.clipboard.writeText(t); this.textContent = '✓ 已複製'; } catch (e) {} };
      outEl.querySelector('#tlSave').onclick = function () {
        saveRecord({ tool: ctx.tool || 'O3 對話', content: content, analysis: ctx.analysis || '', o3: t }, this);
      };
      btn.textContent = '🗣️ 重新產生 O3'; btn.disabled = false;
    }, function (e) { outEl.innerHTML = '<div style="color:#ef4444;font-size:13px">' + esc(e) + '</div>'; btn.textContent = '🗣️ 產生 O3 對話腳本'; btn.disabled = false; });
  }

  /* 儲存分析＋O3 為一筆紀錄（雲端優先，失敗退回本機） */
  function saveRecord(rec, btn) {
    if (typeof window._saveAnalysis !== 'function') { alert('儲存功能需在 App 內、登入後才可用'); return; }
    var orig = btn.textContent; btn.textContent = '儲存中…'; btn.disabled = true;
    Promise.resolve(window._saveAnalysis(rec)).then(function (res) {
      btn.textContent = (res && res.where === 'local') ? '✓ 已存（本機）' : '✓ 已存（雲端）';
    }).catch(function (e) {
      btn.textContent = orig; btn.disabled = false;
      alert('儲存失敗：' + (e && e.message ? e.message : e));
    });
  }

  /* 已存紀錄檢視 */
  var RECORDS = {};
  function loadRecords() {
    var box = modal && modal.querySelector('#tlRecords');
    if (!box) return;
    box.innerHTML = '<div style="color:#6b7280;font-size:13px">載入中…</div>';
    if (typeof window._fbAnalyses !== 'function') { box.innerHTML = '<div style="color:#9ca3af;font-size:13px">需在 App 內使用</div>'; return; }
    Promise.resolve(window._fbAnalyses()).then(function (list) {
      list = list || [];
      if (!list.length) { box.innerHTML = '<div style="color:#9ca3af;font-size:13px">尚無已存紀錄</div>'; return; }
      RECORDS = {};
      box.innerHTML = list.map(function (r) {
        RECORDS[r.id] = r;
        var when = String(r.created_at || '').slice(0, 16).replace('T', ' ');
        return '<div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-bottom:8px">'
          + '<div style="font-size:12px;color:#6b7280;margin-bottom:4px">' + esc(when) + '　' + esc(r.tool || '') + '</div>'
          + '<div style="font-size:12px;color:#374151;white-space:pre-wrap;max-height:48px;overflow:hidden">' + esc((r.content || '').slice(0, 120)) + '</div>'
          + '<div style="display:flex;gap:6px;margin-top:6px">'
          + '<button class="tlRecView" data-id="' + esc(r.id) + '" style="flex:1;padding:5px;background:#0f766e;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer">展開／收合</button>'
          + '<button class="tlRecDel" data-id="' + esc(r.id) + '" style="padding:5px 10px;background:#fee2e2;color:#b91c1c;border:none;border-radius:6px;font-size:12px;cursor:pointer">刪除</button>'
          + '</div>'
          + '<div class="tlRecFull" id="rec_' + esc(r.id) + '" style="display:none;margin-top:8px"></div>'
          + '</div>';
      }).join('');
      box.querySelectorAll('.tlRecView').forEach(function (b) { b.onclick = function () { toggleRecord(b.getAttribute('data-id')); }; });
      box.querySelectorAll('.tlRecDel').forEach(function (b) { b.onclick = function () { delRecord(b.getAttribute('data-id')); }; });
    }).catch(function (e) { box.innerHTML = '<div style="color:#ef4444;font-size:13px">載入失敗：' + esc(e && e.message || e) + '</div>'; });
  }
  function toggleRecord(id) {
    var full = modal.querySelector('#rec_' + id);
    var r = RECORDS[id];
    if (!full || !r) return;
    if (full.style.display === 'none') {
      full.style.display = 'block';
      full.innerHTML = (r.analysis ? ('<div style="font-weight:700;font-size:12px;color:#0f766e;margin:6px 0 2px">框架分析</div><div style="font-size:13px;line-height:1.6;white-space:pre-wrap;color:#134e4a">' + mdBold(r.analysis) + '</div>') : '')
        + (r.o3 ? ('<div style="font-weight:700;font-size:12px;color:#7c3aed;margin:8px 0 2px">O3 對話</div><div style="font-size:13px;line-height:1.6;white-space:pre-wrap;color:#3b0764">' + mdBold(r.o3) + '</div>') : '');
    } else { full.style.display = 'none'; }
  }
  function delRecord(id) {
    if (!confirm('確定刪除這筆紀錄？')) return;
    Promise.resolve(typeof window._deleteAnalysis === 'function' ? window._deleteAnalysis(id) : null).then(loadRecords);
  }

  window.openTools = function (prefill) {
    if (!modal) buildModal();
    modal.style.display = 'flex';
    paint();
    var body = modal.querySelector('#tlBody');
    if (typeof prefill === 'string' && prefill.trim()) {
      var ta = body.querySelector('#tlContent');
      if (ta) ta.value = prefill.trim();
      var banner = document.createElement('div');
      banner.style.cssText = 'background:#ecfdf5;border:1px solid #99f6e4;color:#0f766e;font-size:12px;font-weight:600;line-height:1.5;padding:8px 10px;border-radius:8px;margin-bottom:12px';
      banner.textContent = '🔗 已從「事件診斷」帶入內容 → 選一個框架分析 → 再按「產生 O3 對話腳本」完成整條處理鏈。';
      body.insertBefore(banner, body.firstChild);
    }
  };

  /* 直接對事件產生 O3 對話腳本（供事件歷史「🗣️ O3 對話」使用） */
  window.openToolsO3 = function (prefill) {
    if (!modal) buildModal();
    modal.style.display = 'flex';
    paint();
    var body = modal.querySelector('#tlBody');
    var ta = body.querySelector('#tlContent');
    var content = (typeof prefill === 'string' ? prefill.trim() : '');
    if (ta) ta.value = content;
    var banner = document.createElement('div');
    banner.style.cssText = 'background:#faf5ff;border:1px solid #ddd6fe;color:#7c3aed;font-size:12px;font-weight:600;line-height:1.5;padding:8px 10px;border-radius:8px;margin-bottom:12px';
    banner.textContent = '🔗 已帶入事件並直接產生 O3 對話腳本。上方仍可另選框架做進一步拆解。';
    body.insertBefore(banner, body.firstChild);
    var out = body.querySelector('#tlResult');
    if (!content) { out.innerHTML = '<div style="color:#ef4444;font-size:13px">事件內容為空</div>'; return; }
    out.innerHTML = '<div id="tlO3Result"></div>';
    runO3(content, out.querySelector('#tlO3Result'), { textContent: '', disabled: false });
  };

  /* ---------- 入口按鈕（浮動；與冰山 O3 錯開，避免重疊） ---------- */
  function buildFab() {
    var fab = document.createElement('button');
    fab.id = 'tools-fab';
    fab.textContent = '🧰 工具分析';
    fab.style.cssText = 'position:fixed;right:18px;bottom:72px;z-index:99998;background:#0f766e;color:#fff;border:none;border-radius:999px;padding:12px 18px;font-size:15px;font-weight:700;box-shadow:0 6px 20px rgba(15,118,110,.4);cursor:pointer';
    fab.onmouseover = function () { fab.style.background = '#0b5c55'; };
    fab.onmouseout = function () { fab.style.background = '#0f766e'; };
    fab.onclick = window.openTools;
    document.body.appendChild(fab);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildFab);
  else buildFab();
})();
