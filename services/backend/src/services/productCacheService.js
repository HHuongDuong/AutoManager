module.exports = function createProductCacheService(deps) {
  const { redisDelPattern } = deps;

  async function invalidateProductsCache() {
    await redisDelPattern('products:*');
  }

  return { invalidateProductsCache };
};
