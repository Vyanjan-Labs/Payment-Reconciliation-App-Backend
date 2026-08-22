module.exports = (err, req, res, next) => {
  if (err.code === '23505') {
    return res.status(409).json({ error: 'That email is already registered' });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
};
