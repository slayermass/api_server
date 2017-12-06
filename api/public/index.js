let router = require('express').Router();

router.use(require('./content'));

router.use(require('./menu_items'));

router.use(require('./upload'));

module.exports = router;
