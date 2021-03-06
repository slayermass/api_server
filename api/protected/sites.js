const router = require('express').Router(),
    sitesModel = require('../../models/mysql/sites');

/**
 * получение всех ресурсов
 */
router.get('/sites', (req, res, next) => {

    sitesModel
        .getAll()
        .then(data => {
            res.send(data);
        })
        .catch(err => {
            next(err);
        });
});

module.exports = router;
