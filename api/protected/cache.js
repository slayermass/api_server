const router = require('express').Router();
const cacheModel = require('../../functions/cache');

/**
 * очистка кэша полностью
 */
router.delete('/cache', async (req, res, next) => {
    cacheModel.flushdb();

    res.send({
        success: true,
        message : 'cache cleared'
    });
});

module.exports = router;
