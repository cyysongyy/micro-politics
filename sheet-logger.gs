/**
 * 分析紀錄 → Google Sheet 記錄器（Google Apps Script）
 * for Micro-politics 班級微政治事件管理系統
 * ---------------------------------------------------------------------
 * 用途：App 按「💾 儲存為紀錄」時，除了存 Firebase／本機，
 *       也把同一筆(時間／工具／事件內容／框架分析／O3 對話)寫一列到
 *       你的「MICRO POLITICS」Google 試算表，方便用表格瀏覽。
 *
 * 部署步驟（重點：一定要「在那張試算表裡面」建立，才綁得到它）：
 *   1. 開啟你的「MICRO POLITICS」Google 試算表
 *   2. 上方選單「擴充功能」→「Apps Script」
 *   3. 把本檔全部內容貼進 Code.gs（覆蓋預設）→ 儲存
 *   4. 右上「部署」→「新增部署作業」→ 類型「網頁應用程式」
 *   5. 「執行身分」＝我；「誰可以存取」＝「任何人」
 *   6. 複製「網頁應用程式」的 /exec 網址
 *   7. 回 App →「設定」→「分析紀錄同步到 Google Sheet」貼上該網址 → 儲存網址
 *
 * 之後每按一次「儲存為紀錄」，試算表的「分析紀錄」工作表就會多一列。
 */

var SHEET_NAME = '分析紀錄';
var HEADERS = ['時間', '工具', '事件內容', '框架分析', 'O3 對話'];

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
    sh.appendRow([
      body.created_at || new Date().toISOString(),
      body.tool || '',
      body.content || '',
      body.analysis || '',
      body.o3 || ''
    ]);
    return _json({ ok: true });
  } catch (err) {
    return _json({ error: String(err) });
  }
}

function doGet() {
  return _json({ ok: true, msg: 'sheet logger alive' });
}

function _json(v) {
  return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);
}
