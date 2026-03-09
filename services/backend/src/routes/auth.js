const express = require('express');
const createAuthController = require('../controllers/authController');

module.exports = function createAuthRouter(deps) {
  const { validateBody, loginSchema } = deps;
  const router = express.Router();
  const controller = createAuthController(deps);

  router.post('/auth/login', validateBody(loginSchema), controller.login);

  return router;
};
