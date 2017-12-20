const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    doArray = require('../../functions').doArray,
    model = require('../../models/mysql/text_blocks');

/**
 * create/update html text block
 *
 * @see model.create
 */
router.post('/text_blocks', (req, res, next) => {
    let fk_site = parseInt(req.body.fk_site, 10),
        text_block = {
            isactive: parseInt(req.body.isactive, 10),
            text_block: req.body.text_block,
            type_block: parseInt(req.body.type_block, 10) || 1,
            label_block: req.body.label_block,
            pk_text_block: parseInt(req.body.pk_text_block, 10),
            fk_user_created: parseInt(req.body.fk_user_created, 10)
        };

    // 0 не учитывается при parseInt('0', 10) || 1,
    if (isNaN(text_block.isactive)) {
        text_block.isactive = 1;
    }

    //проверка
    if (
        (isNaN(fk_site) || fk_site < 1) ||
        text_block.text_block.length < 1 || text_block.label_block.length < 1 || text_block.type_block.length < 1
    ) {
        next(BadRequestError());
    } else if (!isNaN(text_block.pk_text_block) && text_block.pk_text_block >= 1) {
        model
            .update(text_block, fk_site)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
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
        pk_text_block = parseInt(req.query.pk_text_block, 10) || 0,
        label_block = req.query.label_block;

    //проверка
    if (
        (isNaN(fk_site) || fk_site < 1) ||
        ((isNaN(pk_text_block) || pk_text_block < 1) && (label_block !== undefined && label_block.length < 1))
    ) {
        next(BadRequestError());
    } else {
        model
            .find(fk_site, pk_text_block, label_block)
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
        next(BadRequestError());
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

/**
 * deleting text blocks by id
 *
 * @see model.delete
 */
router.delete('/text_blocks', (req, res, next) => {
    let delArr = doArray(req.body.delArr);

    if (delArr.length) {
        model
            .delete(delArr)
            .then(count => {
                res.send({
                    success: true,
                    count
                });
            })
            .catch(err => {
                next(err);
            });
    } else {
        next(BadRequestError());
    }
});

module.exports = router;
