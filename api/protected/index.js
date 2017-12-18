let router = require('express').Router();

router.use(require('./checkip'));//проверка ip

router.use(require('./upload'));

router.use(require('./tags'));

router.use(require('./sites'));

router.use(require('./content'));

router.use(require('./menu_items'));

router.use(require('./text_blocks'));

module.exports = router;
