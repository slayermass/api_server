let router = require('express').Router();

router.use(require('./content'));

router.use(require('./menu_items'));

router.use(require('./upload'));

router.use(require('./text_blocks'));

router.use(require('./mainpage'));

router.use(require('./content_comments'));

router.use(require('./banners'));

module.exports = router;
