const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/sphinx/content_search');

/**
 * поиск контента
 *
 * @see model.search(...)
 */
router.get('/content_search', async (req, res, next) => {
    const fk_site = parseInt(req.query.fk_site, 10);
    const search = req.query.search;
    let limit = parseInt(req.query.limit, 10) || 20;
    limit = (limit > 20) ? 20 : limit;
    let offset = parseInt(req.query.offset, 10) || 0;

    if (isNaN(fk_site) || fk_site < 1) {
        next(BadRequestError());
    } else {
        try {
            let data;

            if(fk_site === 1) {
                data = await model.searchPolitsibru(search, limit, offset);
            }

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

module.exports = router;