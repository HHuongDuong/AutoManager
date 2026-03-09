function createMockProvider() {
  return {
    name: 'mock',
    async issue(payload) {
      return {
        status: 'ISSUED',
        external_id: `mock_${Date.now()}`,
        raw: { message: 'mock provider', payload }
      };
    }
  };
}

module.exports = { createMockProvider };
