const router = require('express').Router(),
    functions = require('../../functions'),
    model = require('../../models/mysql/content');

/**
 * getting content for public site
 *
 * @see model.findPublic
 */
router.get('/content', (req, res, next) => {
    let limit = parseInt(req.query.limit, 10) || 20,
        fk_site = parseInt(req.query.fk_site, 10),
        isdeleted = parseInt(req.query.isdeleted, 10) || -1,
        status = parseInt(req.query.status, 10) || 0,
        orderby = (req.query.orderby) ? req.query.orderby : 'pk_content DESC',
        withcount = parseInt(req.query.withcount, 10) || 0,
        offset = parseInt(req.query.offset, 10) || 0,
        slug_tag = req.query.slug_tag,
        search = req.query.search || {};

    if (isNaN(fk_site) || fk_site < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .find(fk_site, {
                limit,
                orderby,
                isdeleted,
                status,
                offset,
                slug_tag
            }, search, withcount)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * получение контента по ид
 *
 * @see contentModel.findOne
 */
router.get('/contentone', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        pk_content = parseInt(req.query.pk_content, 10),
        slug_content = req.query.slug_content;

    if (
        (isNaN(fk_site) || fk_site < 1) ||
        ((isNaN(pk_content) || pk_content < 1) && slug_content.length < 1)
    ) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .findOne(fk_site, pk_content, slug_content)
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
