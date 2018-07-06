const router = require('express').Router();
const model = require('../../models/mysql/banners');
const BadRequestError = require('../../functions').BadRequestError;

/**
 * создание/обновление баннера
 *
 * @see model.save
 */
router.post('/banner', async (req, res, next) => {
    let {body} = req;

    body.fk_site = parseInt(body.fk_site, 10);
    body.banner_pos = parseInt(body.banner_pos, 10);
    body.id_banner = parseInt(body.id_banner, 10);

    if (isNaN(body.fk_site) || body.fk_site < 1
        || isNaN(body.banner_pos) || body.banner_pos < 1
    ) {
        next(BadRequestError());
    } else {
        try {
            if (body.id_banner > 0) { // обновить
                let data = await model.update(body);

                res.send({
                    success: true
                });
            } else { // сохранить
                let data = await model.save(body);

                res.send({
                    success: true,
                    insertId: data
                });
            }
        } catch (err) {
            next(err);
        }
    }
});

/**
 * инфа о баннере
 *
 * @see model.infoBanner
 */
router.get('/banner', async (req, res, next) => {
    let {query} = req;

    query.fk_site = parseInt(query.fk_site, 10);
    query.banner_pos = parseInt(query.banner_pos, 10);

    if (isNaN(query.fk_site) || query.fk_site < 1
        || isNaN(query.banner_pos) || query.banner_pos < 1
    ) {
        next(BadRequestError());
    } else {
        try {
            let data = await model.infoBanner(query);

            res.send({
                success : true,
                data
            });
        } catch (err) {
            next(err);
        }
    }
});

module.exports = router;
