const router = require('express').Router();
const auth_id = require("../../config/index").auth_id;

/*const
    requestIp = require('request-ip'),
    allowedIps = ['::1', '::ffff:109.195.33.201'];*/

/**
 * проверка по ип - не очень. если ты с другого компа и через сделанный фронтенд заходишь,
 * лучше передавать уникальный ид с фронтенда
 *
 * промежуточное по для проверки на доступ перед каждым действием в api
 * + проверка на обяз параметр fk_site
 */
router.all('/*', function (req, res, next) {
    if (req.headers.auth_id === auth_id || req.method === 'OPTIONS') {
        next();
    } else {
        let err = new Error('Access Denied');
        err.status = 401;
        next(err);
    }
});

module.exports = router;
