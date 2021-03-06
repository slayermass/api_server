let router = require('express').Router();

router.use(require('./content'));

router.use(require('./menu_items'));

router.use(require('./upload'));

router.use(require('./text_blocks'));

router.use(require('./mainpage'));

router.use(require('./content_comments'));

router.use(require('./banners'));

router.use(require('./content_search'));

router.use(require('./content_stories'));

module.exports = router;
