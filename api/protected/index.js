let router = require('express').Router();

router.use(require('./checkip'));//проверка ip

router.use(require('./upload'));

router.use(require('./tags'));

router.use(require('./sites'));

module.exports = router;
