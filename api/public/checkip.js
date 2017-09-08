let router = require('express').Router();
const
    requestIp = require('request-ip'),
    allowIps = ['::1', '::ffff:109.195.33.201'];

/**
 * промежуточное по для проверки на доступ перед каждым действием в api
 */
router.all('/*', function (req, res, next) {
    if(allowIps.includes(requestIp.getClientIp(req))) {
        next();
    } else {
        let err = new Error('Access Denied');
        err.status = 401;
        next(err);
    }
});

module.exports = router;
