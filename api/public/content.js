const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/mysql/content'),
    empty = require('is-empty');

let contentCache = {};

/**
 * getting content for public site (index page)
 *
 * @see model.find
 */
router.get('/content', async ({query}, res, next) => {
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
 * getting content for public site by slug
 *
 * + sets a view
 *
 * @see contentModel.findOne
 */
router.get('/contentone', async (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        pk_content = parseInt(req.query.pk_content, 10),
        slug_content = req.query.slug_content || '',
        withimages = parseInt(req.query.withimages, 10) || 0; // (0,1) найти ид файлов и выдать ссылки на них вместе c результатом

    if (
        (isNaN(fk_site) || fk_site < 1) ||
        ((isNaN(pk_content) || pk_content < 1) && slug_content.length < 1)
    ) {
        next(BadRequestError());
    } else {
        // простейший кэш для тестов
        if (!empty(contentCache) &&
            (contentCache.data.slug_content === slug_content || contentCache.data.pk_content === pk_content)
        ) {
            res.send(contentCache);
        } else {
            // end простейший кэш для тестов
            try {
                let data = await model.findOne(fk_site, pk_content, slug_content, {withimages});

                res.send(data);

                contentCache = Object.assign({}, data);

                // увеличить просмотр
                model.incrViews(fk_site, pk_content, slug_content, req);
            } catch (err) {
                next(err);
            }

            // Promise.then()
            /**
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

                    contentCache = {
                        data: data.data,
                        images: data.images,
                        linked_content: data.linked_content
                    };
                    // увеличить просмотр
                    model.incrViews(fk_site, pk_content, slug_content, req);
                })
             .catch(err => {
                    next(err);
                });*/
        }
    }
});

module.exports = router;
