const router = require('express').Router(),
    functions = require('../../functions'),
    contentModel = require('../../models/mysql/content');

/**
 * получение контента по ид
 *
 * @see contentModel.findOne
 */
router.get('/contentone', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        pk_content = parseInt(req.query.pk_content, 10);

    if (isNaN(fk_site) || fk_site < 1 || isNaN(pk_content) || pk_content < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        contentModel
            .findOne(pk_content, fk_site)
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
 * удаление контента по ид
 *
 * @see contentModel.delete
 */
router.delete('/content', (req, res, next) => {
    let delArr = functions.doArray(req.body.delArr);

    if (delArr.length) {
        contentModel
            .delete(delArr)
            .then(count => {
                res.send({
                    success: true,
                    count
                });
            })
            .catch(err => {
                next(err);
            });
    } else {
        let err = new Error();
        err.status = 400;
        next(err);
    }
});

/**
 * получение контента
 *
 * @see contentModel.find
 */
router.get('/content', (req, res, next) => {
    let limit = parseInt(req.query.limit, 10) || 20,
        fk_site = parseInt(req.query.fk_site, 10),
        isdeleted = parseInt(req.query.isdeleted, 10) || -1,
        status = parseInt(req.query.status, 10) || 0,
        orderby = (req.query.orderby) ? req.query.orderby : 'pk_content DESC',
        withcount = parseInt(req.query.withcount, 10) || 0,
        offset = parseInt(req.query.offset, 10) || 0;

    if (isNaN(fk_site) || fk_site < 1) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        contentModel
            .find(fk_site, {
                limit,
                orderby,
                isdeleted,
                status,
                offset
            }, withcount)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * создание/обновление контента
 *
 * @see contentModel.save
 */
router.post('/content', (req, res, next) => {
    let content= {
        title_content: req.body.content.title,
        text_content: req.body.content.text,
        intro_content: req.body.content.intro,
        tags: req.body.content.tags,
        status_content: parseInt(req.body.content.status, 10),
        fk_user_created: parseInt(req.body.content.fk_user_created, 10),
        headimgsrc_content: req.body.content.head_img_src,
        pk_content: parseInt(req.body.content.pk_content, 10)
    };

    let fk_site = parseInt(req.body.fk_site, 10);

    //проверка
    if(content.title_content.length < 1 ||
        content.text_content.length < 1 ||
        (isNaN(content.fk_user_created) || content.fk_user_created < 1) ||
        (isNaN(fk_site) || fk_site < 1)
    ) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else if (content.pk_content) { //редактирование
        contentModel
            .update(content, fk_site)
            .then(data => {
                res.send({
                    success: true,
                    pk_content: data.pk_content
                });
            })
            .catch(err => {
                next(err);
            });
    } else { // сохранение
        contentModel
            .save(content, fk_site)
            .then(data => {
                res.send({
                    success: true,
                    pk_content: data.pk_content
                });
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;
