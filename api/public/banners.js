const router = require('express').Router();
const model = require('../../models/mysql/banners');


router.get('/banners', async (req, res, next) => {
    let {query} = req;

    query.fk_site = parseInt(query.fk_site, 10);

    if (isNaN(query.fk_site) || query.fk_site < 1) {
        next(BadRequestError());
    } else {
        try {
            let data = await model.infoBannerPublic(query);

            res.send({ data });
        } catch (err) {
            next(err);
        }
    }
});

module.exports = router;
