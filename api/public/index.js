let router = require('express').Router();

router.use(require('./content'));

router.use(require('./menu_items'));

router.use(require('./upload'));

router.use(require('./text_blocks'));

module.exports = router;
