const router = require('express').Router();

const redis = require("redis");
const client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});


/**
 * очистка кэша полностью
 */
router.delete('/cache', async (req, res, next) => {
    client.flushdb( function (err, succeeded) {
        console.log(succeeded);
    });

    res.send('cache cleared'); // ?
});

module.exports = router;
