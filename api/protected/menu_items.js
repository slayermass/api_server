const router = require('express').Router(),
    model = require('../../models/mysql/menu_items'),
    modelMenu = require('../../models/mysql/menu');

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

/**
 * get all data menu
 *
 * @see modelMenu.findAll
 */
router.get('/menus', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        limit = parseInt(req.query.limit, 10) || 20,
        offset = parseInt(req.query.offset, 10) || 0,
        search = req.query.search || {};

    //проверка
    if (isNaN(fk_site) || fk_site < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        modelMenu
            .findAll(fk_site, limit, offset, search)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * get data menu by id
 *
 * @see modelMenu.findOne
 */
router.get('/menu', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        pk_menu = parseInt(req.query.pk_menu, 10);

    //проверка
    if ((isNaN(fk_site) || fk_site < 1) || (isNaN(pk_menu) || pk_menu < 1)) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        modelMenu
            .findOne(fk_site, pk_menu)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * save menu
 *
 * @see modelMenu.createOne
 * @see modelMenu.updateOne
 */
router.post('/menu', (req, res, next) => {
    let fk_site = parseInt(req.body.fk_site, 10),
        menu = {
            pk_menu: parseInt(req.body.menu.pk_menu, 10),
            name_menu: req.body.menu.name_menu,
            label_menu: req.body.menu.label_menu
        };

    //проверка
    if ((isNaN(fk_site) || fk_site < 1) || isNaN(menu.pk_menu) || menu.name_menu.length < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else if (menu.pk_menu === 0) { // create
        modelMenu
            .createOne(fk_site, menu)
            .then(() => {
                res.send({
                    success: true
                });
            })
            .catch(err => {
                next(err);
            });
    } else { // update
        modelMenu
            .updateOne(fk_site, menu)
            .then(() => {
                res.send({
                    success: true
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
 * @see model.createOne
 * @see model.updateOne
 */
router.post('/menu_item', (req, res, next) => {
    let fk_site = parseInt(req.body.fk_site, 10),
        pk_menu = parseInt(req.body.pk_menu, 10),
        menu_item = {
            pk_menu_item: parseInt(req.body.menu_item.pk_menu_item, 10),
            name_menu_item: req.body.menu_item.name_menu_item,
            path_menu_item: req.body.menu_item.path_menu_item,
            isactive: parseInt(req.body.menu_item.isactive, 10)
        };

    if (
        (isNaN(fk_site) || fk_site < 1) || menu_item.name_menu_item.length < 1
        || menu_item.path_menu_item.length < 1 || (isNaN(pk_menu) || pk_menu < 1)
    ) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else if (menu_item.pk_menu_item === 0) {
        model
            .createOne(menu_item, pk_menu)
            .then(data => {
                res.send({
                    success: true,
                    id: data.id,
                    isnew: data.isnew
                });
            })
            .catch(err => {
                next(err);
            });
    } else {
        model
            .updateOne(menu_item, pk_menu)
            .then(() => {
                res.send({
                    success: true
                });
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * удалить пункт меню
 *
 * @see model.deleteOne
 */
router.delete('/menu_item', (req, res, next) => {
    let fk_site = parseInt(req.body.fk_site, 10),
        pk_menu = parseInt(req.body.pk_menu, 10),
        pk_menu_item = parseInt(req.body.pk_menu_item, 10);

    if (
        (isNaN(fk_site) || fk_site < 1) ||
        (isNaN(pk_menu_item) || pk_menu_item < 1) ||
        (isNaN(pk_menu) || pk_menu < 1)
    ) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .deleteOne(fk_site, pk_menu, pk_menu_item)
            .then(() => {
                res.send({
                    success: true
                });
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * delete menu
 *
 * @see modelMenu.deleteOne
 */
router.delete('/menu', (req, res, next) => {
    let fk_site = parseInt(req.body.fk_site, 10),
        pk_menu = parseInt(req.body.pk_menu, 10);

    if (
        (isNaN(fk_site) || fk_site < 1) ||
        (isNaN(pk_menu) || pk_menu < 1)
    ) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        modelMenu
            .deleteOne(fk_site, pk_menu)
            .then(() => {
                res.send({
                    success: true
                });
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * create/update sort of items menu
 *
 * @see modelMenu.saveSort
 */
router.post('/menu_sort', (req, res, next) => {
    let fk_site = parseInt(req.body.fk_site, 10),
        pk_menu = parseInt(req.body.pk_menu, 10),
        saveSort = req.body.saveSort;

    if ((isNaN(fk_site) || fk_site < 1) || saveSort.length < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .saveSort(fk_site, pk_menu, saveSort)
            .then(() => {
                res.send({
                    success: true
                });
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;
