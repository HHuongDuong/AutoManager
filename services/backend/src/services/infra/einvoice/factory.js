const { normalizeProvider } = require('./utils');
const { createMockProvider } = require('./providers/mock');
const { createVnptProvider } = require('./providers/vnpt');
const { createMisaProvider } = require('./providers/misa');
const { createFptProvider } = require('./providers/fpt');

const providers = {
  mock: createMockProvider,
  vnpt: createVnptProvider,
  misa: createMisaProvider,
  fpt: createFptProvider
};

function createProvider(code) {
  const key = normalizeProvider(code);
  const factory = providers[key] || createMockProvider;
  return factory();
}

module.exports = { createProvider };
