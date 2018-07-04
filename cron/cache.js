const cacheModel = require('../functions/cache');

cacheModel.flushdb();

console.info('cache cleared'); // ?

process.exit(process.exitCode);
