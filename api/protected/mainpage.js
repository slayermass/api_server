const router = require('express').Router();
const BadRequestError = require('../../functions').BadRequestError;
const empty = require('is-empty');
const model = require('../../models/mysql/mainpage');
const errorlog = require('../../functions').error;

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
                errorlog(err);
                next(err);
            });
    }
});

module.exports = router;
