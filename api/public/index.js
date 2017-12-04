let router = require('express').Router();

router.use(require('./content'));

router.use(require('./upload'));

module.exports = router;
