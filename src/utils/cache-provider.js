const logger = require("../logger");
const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 10, checkperiod: 6000 });

/**
 * If two invocations happen, this method won't allow the second invocation to proceed until
 * the first invocation finishes, useful when the first invocation will cache the result
 *
 * @param key The synchronization key
 * @param fn The async function to make synchronized
 * @return {Promise<any>}
 */
const synchronize = async (key, fn) => {
  const flagKey = `${key}_PROCESSING`;
  let flag = cache.get(flagKey);

  while (flag) {
    logger.debug(`invocation to sync fn waiting`);
    // wait
    await new Promise((resolve) => {
      cache.on("del", (k) => {
        if (k === flagKey) {
          return resolve();
        }
      });
    });
    logger.debug(`invocation to sync fn released`);
    flag = cache.get(flagKey);
  }

  try {
    cache.set(flagKey, true);
    const result = await fn();
    cache.del(flagKey);
    return result;
  } catch (e) {
    cache.del(flagKey);
    throw e;
  }
};

/**
 * Returns the value associated with the `key`, obtaining that value from `fn` if not cached.
 *
 * @param {string} key The key for the cache
 * @param {Function} fn The async function to get value into cache
 * @param {number} ttlInSecs Time to live in seconds for the cached value
 * @return {Promise<any>} Returns the cached value
 */
const getCached = async (key, fn, ttlInSecs) => {
  const value = cache.get(key);
  if (value === undefined) {
    // missed cache
    const result = await fn();
    cache.set(key, result, ttlInSecs);
    return result;
  } else {
    logger.info(`Cached value returned, key: '${key}' ttl: ${ttlInSecs}`);
    return value;
  }
};

/**
 * Returns the value associated with the `key`, obtaining that value from `fn` if not cached.
 *
 * If the value is not cached and two invocations happen, the first invocation will call `fn` to get the value into
 * cache whereas the second invocation will wait for the first invocation to finish and
 * then return the value cached by the first invocation.
 *
 * @param {string} key The key for the cache
 * @param {Function} fn The async function to get value into cache
 * @param {number} ttlInSecs Time to live in seconds for the cached value
 * @return {Promise<any>} Returns the cached value
 */
exports.getCachedSync = async (key, fn, ttlInSecs) => {
  return synchronize(key, async () => getCached(key, fn, ttlInSecs));
};
