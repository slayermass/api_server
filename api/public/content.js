const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    async = require('async'),
    decodeHtml = require('../../functions').decodeHtml,
    model = require('../../models/mysql/content');

/**
 * getting content for public site (index page)
 *
 * @see model.find
 */
router.get('/content', (req, res, next) => {
    let limit = parseInt(req.query.limit, 10) || 20,
        fk_site = parseInt(req.query.fk_site, 10),
        isdeleted = parseInt(req.query.isdeleted, 10) || -1,
        status = parseInt(req.query.status, 10) || 0,
        orderby = (req.query.orderby) ? req.query.orderby : 'pk_content DESC',
        withcount = parseInt(req.query.withcount, 10) || 0,
        offset = parseInt(req.query.offset, 10) || 0,
        name_tag = req.query.name_tag,
        search = req.query.search || {};

    if (isNaN(fk_site) || fk_site < 1) {
        next(BadRequestError());
    } else {
        model
            .find(fk_site, {
                limit,
                orderby,
                isdeleted,
                status,
                offset,
                name_tag
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
 * getting content for public site by slug
 *
 * + sets a view
 *
 * @see contentModel.findOne
 */
router.get('/contentone', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        pk_content = parseInt(req.query.pk_content, 10),
        slug_content = req.query.slug_content,
        withimages = parseInt(req.query.withimages, 10) || 0; // найти ид файлов и выдать ссылки на них вместе c результатом

    if (
        (isNaN(fk_site) || fk_site < 1) ||
        ((isNaN(pk_content) || pk_content < 1) && slug_content.length < 1)
    ) {
        next(BadRequestError());
    } else {
        model
            .findOne(fk_site, pk_content, slug_content, {
                withimages
            })
            .then(data => {
                res.send({
                    data: data.data,
                    images: data.images,
                    linked_content: data.linked_content
                });

                // увеличить просмотр
                model.incrViews(fk_site, pk_content, slug_content);
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;
