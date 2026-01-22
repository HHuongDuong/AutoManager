function createVnptProvider() {
  return {
    name: 'vnpt',
    async issue(payload) {
      return {
        status: 'PENDING',
        external_id: null,
        raw: { message: 'VNPT provider not configured', payload }
      };
    }
  };
}

module.exports = { createVnptProvider };
