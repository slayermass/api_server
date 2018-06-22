const router = require('express').Router();
const BadRequestError = require('../../functions').BadRequestError;
const empty = require('is-empty');
const model = require('../../models/mysql/mainpage');

/**
 * сохранение главной страницы
 *
 * @see model.save
 */
router.post('/mainpage', (req, res, next) => {
    const date = req.body.date;
    const data = req.body.data;
    const fk_site = parseInt(req.body.fk_site, 10);

    if(isNaN(fk_site) || fk_site < 1 || date.length !== 10 || empty(data)) {
        BadRequestError();
    } else {
        model
            .save(fk_site, date, data)
            .then(() => {
                res.send({success: true});
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * получение инфы о главной странице по дате
 *
 * @see model.getMainpageInfoByDate
 */
router.get('/mainpage', async (req, res, next) => {
    const date = req.query.date;
    const fk_site = parseInt(req.query.fk_site, 10);

    if(isNaN(fk_site) || fk_site < 1 || date.length !== 10) {
        BadRequestError();
    } else {
        try {
            let data = await model.getMainpageInfoByDate(fk_site, date);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

module.exports = router;
