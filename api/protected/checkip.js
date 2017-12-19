let router = require('express').Router();
/*const
    requestIp = require('request-ip'),
    allowIps = ['::1', '::ffff:109.195.33.201'];*/

/**
 * проверка по ип - не очень. если ты с другого компа и через сделанный фронтенд заходишь,
 * лучше передавать уникальный ид с фронтенда
 *
 * промежуточное по для проверки на доступ перед каждым действием в api
 * + проверка на обяз параметр fk_site
 */
router.all('/*', function (req, res, next) {
    if(req.headers.auth_id === '666uniqrandomsmid666' || req.method === 'OPTIONS') {
        next();
    } else {
        let err = new Error('Access Denied');
        err.status = 401;
        next(err);
    }
});

module.exports = router;
