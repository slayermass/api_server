const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/mysql/text_blocks');

/**
 * getting content by id/label
 *
 * @see model.find
 */
router.get('/text_block', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        label_block = req.query.label_block;

    //проверка
    if (
        (isNaN(fk_site) || fk_site < 1) ||
        (label_block !== undefined && label_block.length < 1)
    ) {
        next(BadRequestError());
    } else {
        model
            .findPublic(fk_site, label_block)
            .then(data => {
                res.send({
                    data
                });
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;
