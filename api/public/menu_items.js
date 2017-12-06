const router = require('express').Router(),
    model = require('../../models/mysql/menu_items');

/**
 * find menu items by pk_menu or label_menu
 *
 * @see model.findAll
 */
router.get('/menu_items', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        pk_menu = parseInt(req.query.pk_menu, 10) || 0,
        label_menu = req.query.label_menu;

    //проверка
    if (
        (isNaN(fk_site) || fk_site < 1) ||
        ((isNaN(pk_menu) || pk_menu < 1) && label_menu.length < 1)
    ) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .findAll(fk_site, pk_menu, label_menu)
            .then(data => {
                res.send({
                    data
                });
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;
