const router = require('express').Router(),
    InternalServerError = require('../../functions').InternalServerError,
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
        .catch(() => {
            next(InternalServerError());
        });
});

module.exports = router;
