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
    let tags = [];

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
            .checkSave(tags)
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
 *
 */
router.get('/tags', (req, res, next) => {

});

module.exports = router;
