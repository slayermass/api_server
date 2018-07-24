const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/mysql/content_stories');

/**
 * @see model.findAll
 */
router.get('/content_stories', (req, res, next) => {
    const fk_site = parseInt(req.query.fk_site, 10);
    const is_active = parseInt(req.query.is_active, 10) || 0;

    //проверка
    if (isNaN(fk_site) || fk_site < 1) {
        next(BadRequestError());
    } else {
        model
            .getAll(fk_site, is_active)
            .then(data => {
                res.send({
                    success: true,
                    items: data.data,
                    count: data.count
                });
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;
