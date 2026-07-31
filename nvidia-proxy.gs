/**
 * NVIDIA API 代理（Google Apps Script）
 * for Micro-politics 班級微政治事件管理系統
 * ---------------------------------------------------------------------
 * 用途：瀏覽器（GitHub Pages 網頁）無法直接呼叫 NVIDIA API（被 CORS 擋，
 *       錯誤訊息「Load failed」）。這個 GAS 當中繼代理，由伺服器端呼叫
 *       NVIDIA，再把結果回傳給網頁，即可繞過 CORS。
 *
 * 部署步驟：
 *   1. 開 https://script.google.com → 新增專案
 *   2. 把本檔全部內容貼進 Code.gs（覆蓋預設內容）
 *   3. 右上「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *   4. 「執行身分」＝我；「誰可以存取」＝「任何人」
 *   5. 部署後複製「網頁應用程式」的 /exec 網址
 *   6. 回 App →「設定」→ AI 供應商選 NVIDIA → 貼上金鑰、模型，
 *      並把 /exec 網址填到「代理網址」→ 按「驗證並儲存」
 *
 * 安全性：金鑰由網頁隨每次請求帶入（body.key），不存在 GAS。
 *        /exec 網址本身沒有金鑰就無法使用；請勿把「金鑰＋網址」一起外流。
 *        若想更保險，可改把金鑰存在 GAS Script Properties（見底部註解）。
 */

var NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var key = body.key || '';
    if (!key) return _json({ error: { message: '缺少 API Key' } });

    var messages = body.messages || [{ role: 'user', content: String(body.prompt || '') }];
    var payload = {
      model: body.model || 'meta/llama-3.1-70b-instruct',
      messages: messages,
      temperature: (body.temperature != null) ? body.temperature : 0.65,
      max_tokens: body.max_tokens || body.maxTokens || 1200
    };

    var resp = UrlFetchApp.fetch(NVIDIA_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + key },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    // 直接把 NVIDIA 的回應原樣回傳（成功時含 choices[].message.content）
    return _json(resp.getContentText());
  } catch (err) {
    return _json({ error: { message: String(err) } });
  }
}

function doGet() {
  return _json({ ok: true, msg: 'NVIDIA proxy alive' });
}

// 若參數已是字串就原樣輸出，否則序列化
function _json(v) {
  var text = (typeof v === 'string') ? v : JSON.stringify(v);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------------
 * 進階（選用）：把金鑰存在 GAS，不由網頁傳入
 * 1) 專案設定 → 指令碼屬性 → 新增 NVIDIA_KEY = 你的 nvapi-…
 * 2) 上方 var key 改成：
 *      var key = PropertiesService.getScriptProperties().getProperty('NVIDIA_KEY');
 *    並移除網頁端送出的 body.key。
 * ------------------------------------------------------------------- */
