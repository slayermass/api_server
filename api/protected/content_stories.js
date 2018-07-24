const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/mysql/content_stories'),
    cacheModel = require('../../functions/cache');

/**
 * получение всех сюжетов
 */
router.get('/content_stories', (req, res, next) => {
    const fk_site = parseInt(req.query.fk_site, 10);

    if (isNaN(fk_site) || fk_site < 1) {
        next(BadRequestError());
    } else {
        model
            .getAll(fk_site)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * создание сюжета
 */
router.post('/content_story', (req, res, next) => {
    let {body} = req;

    const fk_site = parseInt(body.fk_site, 10);

    const content_story = {
        pk_content_story: parseInt(body.content_story.pk_content_story, 10),
        title_content_story: body.content_story.title_content_story,
        is_active: parseInt(body.content_story.is_active, 10) || 0
    };

    if (isNaN(fk_site) || fk_site < 1 ||
    !content_story.title_content_story || content_story.title_content_story.length < 2) {
        next(BadRequestError());
    } else if (content_story.pk_content_story === 0) { // создать
        model
            .create(fk_site, content_story)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    } else { // обновить
        model
            .update(fk_site, content_story)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * сортировка сюжетов
 */
router.post('/content_stories_sort', (req, res, next) => {
    const fk_site = parseInt(req.body.fk_site, 10);
    const saveSort = req.body.saveSort;

    if ((isNaN(fk_site) || fk_site < 1) || saveSort.length < 1) {
        next(BadRequestError());
    } else {
        model
            .saveSort(fk_site, saveSort)
            .then(() => {
                res.send({
                    success: true
                });

                cacheModel.flushdb();
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;
