const { createProvider } = require('./einvoice/factory');

async function issueInvoice(providerCode, payload, config) {
  const provider = createProvider(providerCode);
  return provider.issue({ ...payload, config });
}

module.exports = { issueInvoice };
