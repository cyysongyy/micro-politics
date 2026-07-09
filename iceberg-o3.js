/* =====================================================================
 * 冰山 O3 教練模組  (Iceberg O3 Coach)  v1.0
 * for Micro-politics 班級微政治事件管理系統
 * ---------------------------------------------------------------------
 * 功能：把「事件歷史」用冰山模型分析，並產生對應的 O3 一對一指導對話。
 *   範圍：綜合全部事件  或  挑選單一事件
 *   深度：單獨分析（本地模板、免金鑰）  或  AI 深入分析（呼叫 Gemini）
 *   對象：校長 → 老師   /   校長 → 學生
 *
 * 冰山三層對應（收錄 Senge 系統思考冰山 + 薩提爾冰山 + NVC）：
 *   現象／行為層 → 結構／情緒層 → 信念／需求層
 * O3 對話採 NVC 漏斗：觀察 → 感受 → 需要 → 請求（全程「我訊息」）
 *
 * 安裝：把本檔放到 repo，於 index.html 的 </body> 前加：
 *   <script src="iceberg-o3.js"></script>
 * 相依：沿用 App 既有的 window._fbEvents() 與 window.callGemini(prompt,maxTokens)
 * ===================================================================== */
(function () {
  'use strict';
  if (window.__icebergO3Loaded) return;
  window.__icebergO3Loaded = true;

  /* ---------- 修正「AI 分析不完整」：提高輸出上限 ----------
   * 原本各 AI 功能呼叫 callGemini(prompt) 使用預設 maxOutputTokens=1200，
   * 而 gemini-2.5-flash 會先花掉部分額度在內部思考，導致可見回答被截斷。
   * 這個包裝把所有 callGemini 呼叫的 token 下限拉高到 8192（非破壞性、免金鑰），
   * 一併修好「介入腳本生成、風險預測分析、課程生成」等既有功能的截斷問題。 */
  const AI_TOKEN_FLOOR = 8192;
  if (typeof window.callGemini === 'function' && !window.callGemini.__floored) {
    const _origCallGemini = window.callGemini;
    const wrapped = function (prompt, maxTokens) {
      return _origCallGemini(prompt, Math.max(Number(maxTokens) || 0, AI_TOKEN_FLOOR));
    };
    wrapped.__floored = true;
    window.callGemini = wrapped;
  }

  /* ---------- 主題知識庫：關鍵字偵測 + 冰山三層 + O3 話術 ---------- */
  const THEMES = [
    {
      id: 'boundary',
      name: '身體界線 / 性平語言',
      kw: ['摸', '屁股', '性器官', '髒話', '自摸', '身體', '界線', '芭比', '換衣服', '碰觸'],
      phenomenon: '涉及身體界線或性相關語言的事件；師生語言鬆動界線，或事發當下未即時處理、直接要學生自行通報。',
      structure: '面對性／界線議題的尷尬與迴避，常以玩笑化解不適；當下的無措與「不知如何接手」的焦慮。',
      belief: '「這不是我這一層要處理的」的權責認知，以及對自身處理界線／性平能力的不安。深層需求＝明確規範與增能，而非被指責。',
      teacher: {
        o: '有兩件跟身體界線、性語言相關的事，紀錄上當下沒有即時處理。',
        f: '這塊我比較放不下心。',
        n: '因為兒少保護和性平是我們無論如何要守住的底線——這既保護孩子，也保護你自己。',
        r: '我想跟你一起把即時處理的 SOP 走一遍，也想理解你當下遇到的困難是什麼。'
      },
      student: {
        o: '我聽說遊戲的時候，有同學碰到別人身體、或說了跟身體有關的話。',
        f: '我有點在意，也想聽聽你的版本。',
        n: '因為每個人的身體都要被尊重，沒有同意就不能碰。',
        r: '我們一起練習「停止、拒絕、道歉」這三句話好嗎？下次遇到你會怎麼做？'
      },
      flag: '⚠️ 重大事件仍須依校內通報／性平流程正式留存，不因關係修復而省略。同理歸同理，程序歸程序。'
    },
    {
      id: 'escalate',
      name: '權責與承接（往上／往外推）',
      kw: ['校長室', '找組長', '自行', '未處理', '未先在班級', '通報', '直接要求', '轉學'],
      phenomenon: '班內事件未在班級當場處理，直接送校長室或要學生自己去找訓導組長。',
      structure: '耗竭與「我已經沒有餘力再承接」；投入後一再失望而先行抽離以自我保護。',
      belief: '「處理衝突不是我這一層的責任」與「學生不會改變」交織。深層需求＝專業效能被看見、不被持續追加負擔。',
      teacher: {
        o: '這學期有幾件班內的事，你選擇讓學生直接來找我或組長 F。',
        f: '說實話我有點擔心，也感覺你最近承受了不少。',
        n: '因為我很看重你的專業，也在意你在這裡能不能安心工作。',
        r: '你願意跟我聊聊，最近最消耗你的是什麼嗎？我們一起把行政和界線這塊變清楚一點。'
      },
      student: {
        o: '我注意到你被請到校長室幾次，很多時候事情還沒在班上說清楚。',
        f: '我想先聽你怎麼想，不是要責備你。',
        n: '因為我希望你在班上就能被好好聽見，而不是每次都跑到這裡。',
        r: '你願意跟我說說，在班上發生了什麼、你希望怎麼被對待嗎？'
      }
    },
    {
      id: 'burnout',
      name: '情緒耗竭 / 被針對感',
      kw: ['沒差', '沒有用', '煩躁', '投訴', '過度關注', '我有提醒', '無力'],
      phenomenon: '公開表露抽離與煩躁：對學生說「沒差」、圍圈時表示投訴變多讓她煩躁、覺得大家過度關注。',
      structure: '被監督、被針對的防衛感與壓力累積；習得無助（「我有提醒／沒有用」）。',
      belief: '固定型心態——學生難以改變、提醒無用。深層需求＝被理解、不孤軍奮戰、回饋是幫助而非壓力。',
      teacher: {
        o: '上次圍圈你提到，最近投訴變多讓你覺得煩躁，也覺得大家特別關注某些狀況。',
        f: '我聽到時，一方面謝謝你願意講，一方面也有點心疼。',
        n: '我重視的是你別覺得孤軍奮戰，也希望回饋是幫助、不是壓力。',
        r: '我們能不能一起想個方式，讓意見用你比較能接受的形式回到你這裡？'
      },
      student: {
        o: '最近你在班上好像常常覺得被盯著、有點煩。',
        f: '如果是這樣，我會想多了解一點。',
        n: '因為我希望你在班上是安心的，不是一直覺得被挑毛病。',
        r: '你願意告訴我，什麼時候你會覺得最不舒服嗎？'
      }
    },
    {
      id: 'coalition',
      name: '橫向串連 / 微政治',
      kw: ['連結其他教師', '擴大影響力', '互通', '認同', '影響力', '串連'],
      phenomenon: '私下連結其他教師、與訓導組長互通訊息、試圖擴大影響力。',
      structure: '想被認同、在系統中有安全感；對現況的不滿以非正式管道流動。',
      belief: '被尊重、有影響力的渴望。深層需求＝好想法能被正式看見與討論，而非地下運作。',
      teacher: {
        o: '我注意到你和幾位老師在一些議題上很有共識、討論很多。',
        f: '我其實蠻樂見老師之間有支持系統的。',
        n: '我在意的是資訊能公開透明地流動，讓好想法被正式看見。',
        r: '你願不願意把你們關心的議題整理一下，拿到正式會議上提？我想聽。'
      },
      student: null
    },
    {
      id: 'parent',
      name: '親師 / 家庭溝通',
      kw: ['家長', '制服', '媽媽', '接送', '奶奶', '親師', '座談'],
      phenomenon: '親師之間的規定與期待落差（如制服、接送），或家長帶著憂慮到校尋求配合。',
      structure: '家長的憂慮但理性、期待被理解與合作；老師對「被要求配合」的敏感。',
      belief: '共同在意孩子長期的成長與動機。深層需求＝清楚的分工與被尊重的溝通。',
      teacher: {
        o: '制服那件事，家長和班級規定之間好像有點資訊落差。',
        f: '我理解臨時被反映會有點為難。',
        n: '我在意的是家長和我們是同一隊，孩子夾在中間不好受。',
        r: '我們能不能約個時間，把規定和事先告知的方式講清楚，讓家長也好配合？'
      },
      student: null
    },
    {
      id: 'learning',
      name: '學習 / 課業',
      kw: ['不及格', '作文', '錯字', '背誦', '學習', '成績', '期中考', '修正'],
      phenomenon: '課業處理上的重複模式（作文批改、要求修正）或成績不理想引發關注。',
      structure: '對教學效能的疲累或例行化；家長對孩子失去學習興趣的擔憂。',
      belief: '重視「孩子別放棄、保住學習動機」。深層需求＝可執行的支持與合理期待。',
      teacher: {
        o: '這幾次的課業處理，好像都停在「挑錯、請學生訂正」這個步驟。',
        f: '我猜你也希望能看到他們真的進步。',
        n: '因為我們共同在意的是孩子的學習動機不要被磨掉。',
        r: '要不要一起設 2–3 個小目標，讓訂正之後看得到成長？'
      },
      student: {
        o: '這次幾科的成績，離你自己想要的好像有一段距離。',
        f: '我不是要唸你，我比較想知道你怎麼看。',
        n: '因為我不希望你因為一次考試就覺得自己不行。',
        r: '我們挑一科先開始，訂一個你做得到的小目標，好嗎？'
      }
    }
  ];

  const NOISE = ['雲端同步測試', 'github pages', 'google sheet', '寫入成功', '測試'];

  function evText(e) {
    return ((e.desc || '') + ' ' + (e.category || '')).toLowerCase();
  }
  function isNoise(e) {
    const t = evText(e);
    return NOISE.some(n => t.includes(n.toLowerCase())) || /s-test/i.test(e.students || '');
  }
  function detectThemes(e) {
    const t = evText(e);
    const hits = THEMES.filter(th => th.kw.some(k => t.includes(k.toLowerCase())));
    return hits.length ? hits : [THEMES[1]]; // 預設歸「權責與承接」
  }
  function fmtDate(e) {
    const raw = String(e.time || e.created_at || '');
    const m = raw.match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : raw.slice(0, 10);
  }

  /* ---------- 本地「單獨分析」輸出 ---------- */
  function ofnrBlock(who, s) {
    if (!s) return '';
    return `\n【${who}】\n  觀察：${s.o}\n  感受：${s.f}\n  需要：${s.n}\n  請求：${s.r}`;
  }
  function icebergBlock(th) {
    return `〔${th.name}〕\n  ● 現象／行為：${th.phenomenon}\n  ● 結構／情緒：${th.structure}\n  ● 信念／需求：${th.belief}`
      + (th.flag ? `\n  ${th.flag}` : '');
  }
  function localSingle(e, target) {
    const ths = detectThemes(e);
    let out = `📅 ${fmtDate(e)}｜主述：${e.students || '—'}｜導師：${e.teacher || '—'}｜嚴重性：${e.severity || '—'}\n事件：${e.desc || ''}\n`;
    out += `\n──── 冰山分析 ────\n`;
    ths.forEach(th => { out += icebergBlock(th) + '\n'; });
    out += `\n──── O3 指導對話（觀察→感受→需要→請求）────`;
    ths.forEach(th => {
      if (target === 'teacher' || target === 'both') out += ofnrBlock('校長 → 老師', th.teacher);
      if ((target === 'student' || target === 'both') && th.student) out += ofnrBlock('校長 → 學生', th.student);
      out += '\n';
    });
    return out.trim();
  }
  function localGlobal(events, target) {
    const real = events.filter(e => !isNoise(e));
    const tally = {};
    real.forEach(e => detectThemes(e).forEach(th => {
      tally[th.id] = tally[th.id] || { th, count: 0, dates: [] };
      tally[th.id].count++; tally[th.id].dates.push(fmtDate(e));
    }));
    const ranked = Object.values(tally).sort((a, b) => b.count - a.count);
    let out = `📊 綜合冰山分析｜有效事件 ${real.length} 筆（已濾除 ${events.length - real.length} 筆測試／重複）\n`;
    out += `主要模式（依出現次數）：\n`;
    ranked.forEach((r, i) => { out += `  ${i + 1}. ${r.th.name}　×${r.count}\n`; });
    out += `\n──── 冰山三層彙整 ────\n`;
    ranked.forEach(r => { out += icebergBlock(r.th) + '\n\n'; });
    out += `──── 建議 O3 對話（依優先序）────`;
    ranked.forEach(r => {
      const th = r.th;
      out += `\n\n＝＝ ${th.name} ＝＝`;
      if (target === 'teacher' || target === 'both') out += ofnrBlock('校長 → 老師', th.teacher);
      if ((target === 'student' || target === 'both') && th.student) out += ofnrBlock('校長 → 學生', th.student);
    });
    out += `\n\n💡 對話心法：先連結再處理；全程用「我」開頭；請求必須可被拒絕；重大事件同理照做、程序照走。`;
    return out.trim();
  }

  /* ---------- AI「深入分析」：組 prompt 呼叫既有 callGemini ---------- */
  function buildPrompt(payload, target) {
    const tgt = target === 'teacher' ? '校長對老師' : target === 'student' ? '校長對學生' : '校長對老師、以及校長對學生';
    return `你是台灣國小校長的教練顧問，精通薩提爾冰山、Senge 系統思考冰山與非暴力溝通(NVC)。
請針對以下班級微政治事件資料，完成兩部分，全程使用繁體中文：

【第一部分：冰山分析】三層，務必分層標示：
1) 現象／行為層：客觀描述可見言行（不評斷）。
2) 結構／情緒層：當事人當下的感受與期待。
3) 信念／需求層：行為背後最深層的信念與渴望（人本需求）。

【第二部分：O3 一對一指導對話（${tgt}）】
用 NVC 漏斗寫出可以直接照唸的四句，且把「你訊息(指責)」轉成「我訊息(連結)」：
  觀察(描述客觀事實) → 感受(表達心情與連結) → 需要(說出重視的價值) → 請求(可被拒絕的具體請求)。
若事件涉及身體界線／性平，請額外提醒：同理歸同理、程序歸程序，重大事件仍須依通報流程處理。

事件資料如下：
${payload}

請直接輸出分析與對話，不要加開場白，不要用 markdown 星號。`;
  }

  async function aiAnalyze(payload, target) {
    if (typeof window.callGemini !== 'function') throw new Error('找不到 callGemini（請確認在 App 內執行）');
    return await window.callGemini(buildPrompt(payload, target), 8192);
  }
  function payloadFromEvent(e) {
    return `日期:${fmtDate(e)}｜主述人物:${e.students || '—'}｜導師:${e.teacher || '—'}｜類別:${e.category || '—'}｜嚴重性:${e.severity || '—'}\n事件描述:${e.desc || ''}`;
  }
  function payloadFromAll(events) {
    const real = events.filter(e => !isNoise(e));
    return `以下為 ${real.length} 筆有效事件（已濾除測試與重複），請綜合分析找出跨事件的共同模式：\n` +
      real.map((e, i) => `${i + 1}. ` + payloadFromEvent(e).replace(/\n/g, ' ')).join('\n');
  }

  /* ---------- UI ---------- */
  const CSS = `
  #io3-fab{position:fixed;right:18px;bottom:18px;z-index:99998;background:#4f46e5;color:#fff;border:none;border-radius:999px;padding:12px 18px;font-size:15px;font-weight:700;box-shadow:0 6px 20px rgba(79,70,229,.4);cursor:pointer}
  #io3-fab:hover{background:#3730a3}
  #io3-overlay{position:fixed;inset:0;z-index:99999;background:rgba(17,24,39,.5);display:none;align-items:center;justify-content:center;padding:16px}
  #io3-modal{background:#fff;width:min(760px,96vw);max-height:92vh;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;font-family:system-ui,"Noto Sans TC",sans-serif}
  #io3-head{background:#4f46e5;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center}
  #io3-head b{font-size:17px}
  #io3-x{background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1}
  #io3-body{padding:16px 18px;overflow:auto}
  .io3-row{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin-bottom:12px}
  .io3-row label{font-size:13px;color:#374151;font-weight:600}
  .io3-seg{display:inline-flex;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}
  .io3-seg button{border:none;background:#fff;padding:7px 12px;font-size:13px;cursor:pointer;color:#4b5563}
  .io3-seg button.on{background:#e0e7ff;color:#3730a3;font-weight:700}
  #io3-evsel{flex:1;min-width:220px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px}
  #io3-run{background:#4f46e5;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer}
  #io3-run:disabled{opacity:.5;cursor:wait}
  #io3-copy{background:#10b981;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px}
  #io3-out{white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;font-size:13.5px;line-height:1.7;color:#111827;margin-top:12px;min-height:60px}
  .io3-hint{font-size:12px;color:#9ca3af;margin-top:4px}
  `;

  let state = { scope: 'all', depth: 'local', target: 'teacher', events: [] };

  function seg(name, opts) {
    return `<span class="io3-seg" data-seg="${name}">` +
      opts.map(o => `<button data-val="${o.v}" class="${o.on ? 'on' : ''}">${o.t}</button>`).join('') + `</span>`;
  }

  function buildUI() {
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const fab = document.createElement('button'); fab.id = 'io3-fab'; fab.textContent = '🧊 冰山 O3';
    document.body.appendChild(fab);
    const ov = document.createElement('div'); ov.id = 'io3-overlay';
    ov.innerHTML = `<div id="io3-modal">
      <div id="io3-head"><b>🧊 冰山 O3 教練</b><button id="io3-x">×</button></div>
      <div id="io3-body">
        <div class="io3-row"><label>範圍</label>${seg('scope', [{ v: 'all', t: '綜合全部', on: 1 }, { v: 'one', t: '單一事件' }])}
          <select id="io3-evsel" style="display:none"></select></div>
        <div class="io3-row"><label>深度</label>${seg('depth', [{ v: 'local', t: '單獨分析（免金鑰）', on: 1 }, { v: 'ai', t: 'AI 深入分析' }])}</div>
        <div class="io3-row"><label>對象</label>${seg('target', [{ v: 'teacher', t: '校長→老師', on: 1 }, { v: 'student', t: '校長→學生' }, { v: 'both', t: '兩者' }])}</div>
        <div class="io3-row"><button id="io3-run">▶ 產生分析與對話</button><button id="io3-copy" style="display:none">複製</button></div>
        <div class="io3-hint">單獨分析＝本地冰山模板，即時、免 Gemini Key；AI 深入分析＝呼叫你在「設定」填入的 Gemini。</div>
        <div id="io3-out">點「產生」開始。</div>
      </div></div>`;
    document.body.appendChild(ov);

    fab.onclick = openPanel;
    ov.querySelector('#io3-x').onclick = () => ov.style.display = 'none';
    ov.onclick = ev => { if (ev.target === ov) ov.style.display = 'none'; };

    ov.querySelectorAll('.io3-seg').forEach(sg => {
      sg.querySelectorAll('button').forEach(b => b.onclick = () => {
        sg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        const key = sg.getAttribute('data-seg'); state[key] = b.getAttribute('data-val');
        if (key === 'scope') ov.querySelector('#io3-evsel').style.display = (state.scope === 'one') ? 'block' : 'none';
      });
    });
    ov.querySelector('#io3-run').onclick = run;
    ov.querySelector('#io3-copy').onclick = () => {
      navigator.clipboard.writeText(ov.querySelector('#io3-out').textContent);
      const c = ov.querySelector('#io3-copy'); c.textContent = '已複製 ✓'; setTimeout(() => c.textContent = '複製', 1500);
    };
  }

  async function openPanel() {
    document.getElementById('io3-overlay').style.display = 'flex';
    try {
      state.events = (typeof window._fbEvents === 'function') ? await window._fbEvents() : [];
    } catch (e) { state.events = []; }
    const sel = document.getElementById('io3-evsel');
    sel.innerHTML = state.events.map((e, i) =>
      `<option value="${i}">${fmtDate(e)}｜${(e.students || '—')}｜${(e.desc || '').slice(0, 22)}</option>`).join('');
  }

  async function run() {
    const out = document.getElementById('io3-out');
    const runBtn = document.getElementById('io3-run');
    const copyBtn = document.getElementById('io3-copy');
    copyBtn.style.display = 'none';
    if (!state.events.length) { out.textContent = '沒有讀到事件資料（請在 App 內、雲端載入後再試）。'; return; }

    try {
      let text;
      if (state.depth === 'local') {
        text = state.scope === 'one'
          ? localSingle(state.events[+document.getElementById('io3-evsel').value || 0], state.target)
          : localGlobal(state.events, state.target);
      } else {
        runBtn.disabled = true; out.textContent = '🤖 AI 分析中…（呼叫 Gemini）';
        const payload = state.scope === 'one'
          ? payloadFromEvent(state.events[+document.getElementById('io3-evsel').value || 0])
          : payloadFromAll(state.events);
        text = await aiAnalyze(payload, state.target);
      }
      out.textContent = text;
      copyBtn.style.display = 'inline-block';
    } catch (err) {
      out.textContent = '⚠️ ' + (err && err.message ? err.message : err) +
        '\n\n（AI 深入分析需在「設定」填入 Gemini API Key；或改用「單獨分析」即可免金鑰使用。）';
    } finally {
      runBtn.disabled = false;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
  else buildUI();
})();
