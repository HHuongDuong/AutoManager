function createMisaProvider() {
  return {
    name: 'misa',
    async issue(payload) {
      return {
        status: 'PENDING',
        external_id: null,
        raw: { message: 'MISA provider not configured', payload }
      };
    }
  };
}

module.exports = { createMisaProvider };
