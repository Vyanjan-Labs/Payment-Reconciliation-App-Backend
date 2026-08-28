const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

function parseFile(buffer, filename) {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();

  if (ext === '.csv') {
    return parse(buffer, { columns: true, trim: true, skip_empty_lines: true });
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { raw: false });
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

module.exports = { parseFile };
