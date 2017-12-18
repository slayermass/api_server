const router = require('express').Router(),
    model = require('../../models/mysql/text_blocks');

/**
 * create/update html text block
 *
 * @see model.create
 */
router.post('/text_blocks', (req, res, next) => {
    let fk_site = parseInt(req.body.fk_site, 10),
        text_block = {
            isactive: parseInt(req.body.isactive, 10) || 1,
            text: req.body.text,
            type: req.body.type,
            label: req.body.label,
            pk_text_block: parseInt(req.body.pk_text_block, 10),
            fk_user_created: parseInt(req.body.fk_user_created, 10)
        };

    //проверка
    if (
        (isNaN(fk_site) || fk_site < 1) ||
        text_block.text.length < 1 || text_block.label.length < 1 || text_block.type.length < 1
    ) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .create(text_block, fk_site)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * getting content by id/label
 *
 * @see model.find
 */
router.get('/text_block', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        pk_block = parseInt(req.query.pk_block, 10) || 0,
        label = req.query.label;

    //проверка
    if (
        (isNaN(fk_site) || fk_site < 1) ||
        ((isNaN(pk_block) || pk_block < 1) && label.length < 1)
    ) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .find(fk_site, pk_block, label)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * getting all content
 *
 * @see contentModel.find
 */
router.get('/text_blocks', (req, res, next) => {
    let limit = parseInt(req.query.limit, 10) || 20,
        fk_site = parseInt(req.query.fk_site, 10),
        orderby = (req.query.orderby) ? req.query.orderby : 'pk_text_block DESC',
        offset = parseInt(req.query.offset, 10) || 0,
        search = req.query.search || {};

    if (isNaN(fk_site) || fk_site < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .findAll(fk_site, {
                limit,
                orderby,
                offset
            }, search)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;
