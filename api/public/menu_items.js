const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/mysql/menu_items');

/**
 * find menu items by pk_menu or label_menu
 *
 * @see model.findAll
 */
router.get('/menu_items', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        label_menu = req.query.label_menu;

    //проверка
    if ((isNaN(fk_site) || fk_site < 1) || label_menu.length < 1) {
        next(BadRequestError());
    } else {
        model
            .findAll(fk_site, NaN, label_menu)
            .then(data => {
                res.send({
                    success: true,
                    label_menu: data.label_menu,
                    menu_items: data.menu_items
                });
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;
