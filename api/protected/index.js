let router = require('express').Router();

router.use(require('./checkip'));//проверка ip

router.use(require('./upload'));

router.use(require('./tags'));

router.use(require('./sites'));

router.use(require('./content'));

router.use(require('./menu_items'));

router.use(require('./text_blocks'));

router.use(require('./material_types'));

router.use(require('./material_rubrics'));

router.use(require('./mainpage'));

router.use(require('./banners'));

router.use(require('./cache'));

module.exports = router;
