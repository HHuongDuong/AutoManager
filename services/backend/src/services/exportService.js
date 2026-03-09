const ExcelJS = require('exceljs');

function toCsv(rows, headers) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [];
  lines.push(headers.map(h => escape(h.label)).join(','));
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h.key])).join(','));
  }
  return lines.join('\n');
}

async function sendXlsx(res, rows, sheetName, filename) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const keys = rows?.length ? Object.keys(rows[0]) : [];
  worksheet.columns = keys.map(key => ({ header: key, key }));
  if (rows?.length) worksheet.addRows(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(Buffer.from(buffer));
}

module.exports = { toCsv, sendXlsx };
