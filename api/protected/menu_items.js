const router = require('express').Router(),
    model = require('../../models/mysql/menu_items');

/**
 * найти все пункты меню (и структуру)
 *
 * @see model.findAll
 */
router.get('/menu_items', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10);

    //проверка
    if (isNaN(fk_site) || fk_site < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .findAll(fk_site)
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

/**
 * сохранить пункт меню
 *
 * @see model.saveOne
 */
router.post('/menu_item', (req, res, next) => {
    let fk_site = parseInt(req.body.fk_site, 10),
        menu_item = {
            pk_menu_item: parseInt(req.body.menu_item.pk_menu_item, 10),
            name_menu_item: req.body.menu_item.name_menu_item,
            path_menu_item: req.body.menu_item.path_menu_item,
            isactive: parseInt(req.body.menu_item.isactive, 10)
        };

    if (isNaN(fk_site) || fk_site < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .saveOne(fk_site, menu_item)
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
