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
  var IS = 'width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box';
  var BS = 'width:100%;padding:12px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px';
  function fld(l, inner) { return '<div style="margin-bottom:12px"><div style="font-size:12px;color:#6b7280;font-weight:600;margin-bottom:4px">' + l + '</div>' + inner + '</div>'; }
  function toolOpts() { return TOOLS.map(function (t) { return '<option value="' + t.id + '">' + t.name + '</option>'; }).join(''); }

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
      + fld('事件內容', '<textarea id="tlContent" rows="5" placeholder="描述要分析的事件或情況，例：資深老師抱怨又要弄新計畫、增加負擔…" style="' + IS + ';resize:vertical"></textarea>')
      + '<button id="tlRun" style="' + BS + '">🔍 用 AI 分析</button>'
      + '<div id="tlResult" style="margin-top:14px"></div>';
    body.querySelector('#tlRun').onclick = run;
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
      out.querySelector('#tlO3').onclick = function () { runO3(savedContent, out.querySelector('#tlO3Result'), this); };
    }, function (e) { out.innerHTML = '<div style="color:#ef4444;font-size:13px">' + esc(e) + '</div>'; });
  }

  function runO3(content, outEl, btn) {
    btn.textContent = '產生中…'; btn.disabled = true;
    outEl.innerHTML = '<div style="color:#6b7280;font-size:13px">O3 腳本產生中…</div>';
    analyze(O3_SYS, content, function (t) {
      outEl.innerHTML = '<div style="border:1px solid #ddd6fe;background:#faf5ff;border-radius:10px;padding:14px">'
        + '<div style="font-size:12px;font-weight:700;color:#7c3aed;margin-bottom:8px">🗣️ O3 一對一對話腳本</div>'
        + '<div style="font-size:14px;line-height:1.8;color:#3b0764;white-space:pre-wrap">' + mdBold(t) + '</div></div>'
        + '<button id="tlO3Copy" style="margin-top:8px;padding:8px 14px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">📋 複製對話腳本</button>';
      outEl.querySelector('#tlO3Copy').onclick = function () { try { navigator.clipboard.writeText(t); this.textContent = '✓ 已複製'; } catch (e) {} };
      btn.textContent = '🗣️ 重新產生 O3'; btn.disabled = false;
    }, function (e) { outEl.innerHTML = '<div style="color:#ef4444;font-size:13px">' + esc(e) + '</div>'; btn.textContent = '🗣️ 產生 O3 對話腳本'; btn.disabled = false; });
  }

  window.openTools = function () { if (!modal) buildModal(); modal.style.display = 'flex'; paint(); };

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
