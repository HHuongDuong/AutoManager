module.exports = function validateBody(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body || {}, { abortEarly: false, allowUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'invalid_input',
        detail: error.details.map(d => d.message)
      });
    }
    return next();
  };
};
