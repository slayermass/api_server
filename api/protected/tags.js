const router = require('express').Router(),
    tagsModel = require('../../models/mysql/tags');

/**
 * создание тега
 * проверка существования
 *
 * @see tags.checkSave
 *
 * @returns {Array} {"pk_tag": {int},"name_tag": {String}},
 */
router.post('/tags', (req, res, next) => {
    let tags = [], fk_site = parseInt(req.body.fk_site);

    if(Array.isArray(req.body.tags)) {
        for(let i = 0; i < req.body.tags.length; i++) {
            if(req.body.tags[i].length) {
                tags.push(req.body.tags[i]);
            }
        }
    } else {
        if(req.body.tags.length) {
            tags.push(req.body.tags);
        }
    }

    if(tags.length === 0) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        tagsModel
            .checkSave(fk_site, tags)
            .then(data => {
                res.send(data);
            })
            .catch(() => {
                let err = new Error();
                err.status = 500;
                next(err);
            });
    }
});

/**
 * получить теги
 *
 * @see tagsModel.getAllBySite
 */
router.get('/tags', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site),
        limit = parseInt(req.query.limit) || 25,
        offset = parseInt(req.query.offset) || 0;

    if(limit > 500) limit = 500;

    if(isNaN(fk_site)) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        tagsModel
            .getAllBySite(fk_site, limit, offset)
            .then(data => {
                res.send(data);
            })
            .catch(() => {
                let err = new Error();
                err.status = 500;
                next(err);
            });
    }
});

/**
 * поиск тегов по названию
 *
 * @see tagsModel.findByName
 */
router.get('/tags/findByName', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site),
        name = req.query.name || '';

    if(isNaN(fk_site) && name.length < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        tagsModel
            .findByName(fk_site, name)
            .then(data => {
                let ret = [];

                for(let i = 0; i < data.length; i++) {
                    ret.push({
                        id: data[i].pk_tag,
                        label: data[i].name_tag
                    });
                }

                res.json(ret);
            })
            .catch(() => {
                let err = new Error();
                err.status = 500;
                next(err);
            });
    }
});

module.exports = router;
