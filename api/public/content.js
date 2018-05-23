const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/mysql/content'),
    empty = require('is-empty');

/**
 * getting content for public site (index page)
 *
 * @see model.find
 */
router.get('/content', async (req, res, next) => {
    let {query} = req;

    // validate
    query.limit = parseInt(query.limit, 10) || 20;
    query.fk_site = parseInt(query.fk_site, 10);
    query.isdeleted = parseInt(query.isdeleted, 10) || -1;
    query.status = parseInt(query.status, 10) || 0;
    query.withcount = parseInt(query.withcount, 10) || 0;
    query.offset = parseInt(query.offset, 10) || 0;

    if (isNaN(query.fk_site) || query.fk_site < 1) {
        next(BadRequestError());
    } else {
        try {
            let data = await model.find(query);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

/**
 * getting content for public site by slug or pk_content
 *
 * + sets a view
 *
 * @see contentModel.findOne
 */
router.get('/contentone', async (req, res, next) => {
    let query = req.query;

    // validate
    query.fk_site = parseInt(query.fk_site, 10);
    query.pk_content = parseInt(query.pk_content, 10) || 0;
    query.slug_content = query.slug_content || '';
    query.withimages = parseInt(query.withimages, 10) || 0; // (0,1) найти ид файлов и выдать ссылки на них вместе c результатом

    if (
        (isNaN(query.fk_site) || query.fk_site < 1) ||
        ((isNaN(query.pk_content) || query.pk_content < 1) && query.slug_content.length < 1)
    ) {
        next(BadRequestError());
    } else {
            try {
                let data = await model.findOne(query);

                res.send(data);
            } catch (err) {
                next(err);
            }

        // увеличить просмотр
        model.incrViews(query.fk_site, query.pk_content, query.slug_content, req);
    }
});

module.exports = router;
