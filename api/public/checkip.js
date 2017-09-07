'use strict;'
let router = require('express').Router();

/**
 * промежуточное по для проверки на доступ перед каждым действием в api
 */
router.all('/*', function (req, res, next) {
    console.log('промежуточное по', req.connection.remoteAddress);

    next();
    /**
     let err = new Error('По токену не найден пользователь');
     err.status = 401;
     next(err);
     */
});

module.exports = router;
