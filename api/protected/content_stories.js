const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/mysql/content_stories');

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

    if (isNaN(fk_site) || fk_site < 1 ||
    !body.content_story.title_content_story || body.content_story.title_content_story.length < 2) {
        next(BadRequestError());
    } else {
        model
            .create(fk_site, body.content_story)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;
