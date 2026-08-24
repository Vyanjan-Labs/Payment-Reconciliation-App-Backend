const multer = require('multer');
const AppError = require('../../utils/AppError');

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new AppError('Only .csv, .xlsx, or .xls files are allowed', 400));
    }
    cb(null, true);
  },
});

module.exports = upload;
