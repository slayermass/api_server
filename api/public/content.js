const router = require('express').Router(),
    functions = require('../../functions'),
    model = require('../../models/mysql/content');

/**
 * getting content for public site
 *
 * @see model.findPublic
 */
/**router.get('/content', (req, res, next) => {
    let limit = parseInt(req.query.limit, 10) || 20,
        fk_site = parseInt(req.query.fk_site, 10),
        isdeleted = parseInt(req.query.isdeleted, 10) || -1,
        status = parseInt(req.query.status, 10) || 0,
        orderby = (req.query.orderby) ? req.query.orderby : 'pk_content DESC',
        withcount = parseInt(req.query.withcount, 10) || 0,
        offset = parseInt(req.query.offset, 10) || 0,
        search = req.query.search || {};

    if (isNaN(fk_site) || fk_site < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        model
            .findPublic(fk_site, {
                limit,
                orderby,
                isdeleted,
                status,
                offset
            }, search, withcount)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});*/

module.exports = router;
