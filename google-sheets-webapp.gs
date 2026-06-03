const SPREADSHEET_ID = '1OEw1WMNdB5GuZi-ikqUBkybECpjgGpABEecoZ2qQ980';
const SHEET_NAME = '診断結果';

const HEADERS = [
  '回答日時',
  '会社名',
  'お名前',
  'メールアドレス',
  '診断カテゴリ',
  '電話番号',
  '業種',
  '従業員数',
  '困りごと',
  'Q1',
  'Q2',
  'Q3',
  'Q4',
  'Q5',
  'Q6',
  'Q7',
  'Q8',
  'Q9',
  'Q10',
  'Q11',
  'Q12',
  'Q13',
  'Q14',
  'Q15',
  '探しやすさ',
  '伝わりやすさ',
  'そろっている度',
  'つながっている度',
  '進めやすさ',
  '一番低い軸',
  '個別相談希望',
  '送信JSON',
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const sheet = getOrCreateSheet_();
    const row = buildRow_(payload);

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet_() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function buildRow_(payload) {
  const answers = payload['15問の回答'] || [];
  const scores = payload['5軸スコア'] || [];

  return [
    payload['回答日時'] || '',
    payload['会社名'] || '',
    payload['お名前'] || '',
    payload['メールアドレス'] || '',
    payload['診断カテゴリ'] || '',
    payload['電話番号'] || '',
    payload['業種'] || '',
    payload['従業員数'] || '',
    payload['困りごと'] || '',
    ...Array.from({ length: 15 }, (_, index) => {
      const answer = answers.find((item) => Number(item['質問番号']) === index + 1);
      return answer ? answer['回答'] : '';
    }),
    getScore_(scores, '探しやすさ'),
    getScore_(scores, '伝わりやすさ'),
    getScore_(scores, 'そろっている度'),
    getScore_(scores, 'つながっている度'),
    getScore_(scores, '進めやすさ'),
    payload['一番低い軸'] || '',
    payload['個別相談希望'] || '',
    JSON.stringify(payload),
  ];
}

function getScore_(scores, axisName) {
  const item = scores.find((score) => score['診断軸'] === axisName);
  return item ? item['スコア'] : '';
}
