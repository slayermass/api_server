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
    const id_index_page = parseInt(req.body.id_index_page, 10);
    const update = parseInt(req.body.update, 10) || 0;

    if(isNaN(fk_site) || fk_site < 1 || date.length !== 10 || empty(data)) {
        BadRequestError();
    } else if(update === 1 && id_index_page >= 1) { // обновить
        model
            .update(fk_site, id_index_page, data)
            .then(() => {
                res.send({success: true});
            })
            .catch(err => {
                next(err);
            });
    } else { // создать
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
 * @see model.getMainpageInfoByDateOrId
 */
router.get('/mainpageByDateOrId', async (req, res, next) => {
    const fk_site = parseInt(req.query.fk_site, 10);
    const id_index_page = parseInt(req.query.id, 10);

    if(isNaN(fk_site) || fk_site < 1 || isNaN(id_index_page) || id_index_page < 1) {
        BadRequestError();
    } else {
        try {
            let data = await model.getMainpageInfoByDateOrId(fk_site, id_index_page);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

/**
 * получение общей инфы о дате/данных страниц
 *
 * @see model.getMainpageInfo
 */
router.get('/mainpageInfo', async (req, res, next) => {
    const fk_site = parseInt(req.query.fk_site, 10);

    if(isNaN(fk_site) || fk_site < 1) {
        BadRequestError();
    } else {
        try {
            let data = await model.getMainpageInfo(fk_site);

            res.send({
                success: true,
                data
            });
        } catch (err) {
            next(err);
        }
    }
});

module.exports = router;
