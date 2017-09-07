let router = require('express').Router();

router.use(require('./checkip'));//проверка ip

router.use(require('./upload'));

module.exports = router;
