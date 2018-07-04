const cacheModel = require('../functions/cache');

cacheModel.flushdb();

console.info('cache cleared'); // ?

process.exit(22);
