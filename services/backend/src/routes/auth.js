const express = require('express');
const createAuthController = require('../controllers/authController');

module.exports = function createAuthRouter(deps) {
  const { validateBody, loginSchema, authenticate } = deps;
  const router = express.Router();
  const controller = createAuthController(deps);

  router.post('/auth/login', validateBody(loginSchema), controller.login);
  router.get('/me', authenticate, controller.me);

  return router;
};
