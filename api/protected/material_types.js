const router = require('express').Router(),
    model = require('../../models/mysql/content_material_type');

/**
 * получение всех типов материала
 */
router.get('/material_types', (req, res, next) => {
    model
        .getAll()
        .then(data => {
            res.send(data);
        })
        .catch(err => {
            next(err);
        });
});

module.exports = router;
