const router = require('express').Router();
const BadRequestError = require('../../functions').BadRequestError;
const empty = require('is-empty');
const model = require('../../models/mysql/mainpage');

/**
 * получение главной страницы
 * последней сохраненной
 */
router.get('/mainpage', async (req, res, next) => {
    let {query} = req;

    query.fk_site = parseInt(query.fk_site, 10);
    query.select = (!empty(query.select)) ? query.select.split(',') : []; // только определенные поля на выбор

    if(isNaN(query.fk_site) || query.fk_site < 1 || query.select.length === 0) {
        BadRequestError();
    } else {
        try {
            let data = await model.getMainpagePublic(query.fk_site, query.select);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

module.exports = router;
