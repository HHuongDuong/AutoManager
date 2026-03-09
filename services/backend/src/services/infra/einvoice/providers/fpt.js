function createFptProvider() {
  return {
    name: 'fpt',
    async issue(payload) {
      return {
        status: 'PENDING',
        external_id: null,
        raw: { message: 'FPT provider not configured', payload }
      };
    }
  };
}

module.exports = { createFptProvider };
