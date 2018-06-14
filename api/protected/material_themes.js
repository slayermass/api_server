const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/mysql/content_material_theme');

/**
 * получение всех типов материала
 *
 * @see model.getAll()
 */
router.get('/material_themes', (req, res, next) => {
    const fk_site = parseInt(req.query.fk_site, 10);

    //проверка
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

module.exports = router;
