const router = require('express').Router(),
    functions = require('../../functions'),
    BadRequestError = require('../../functions').BadRequestError,
    contentModel = require('../../models/mysql/content');

/**
 * getting content for public site by slug or pk_content
 *
 * @see contentModel.findOne
 */
router.get('/contentone', async (req, res, next) => {
    let query = req.query;

    // validate
    query.fk_site = parseInt(query.fk_site, 10);
    query.pk_content = parseInt(query.pk_content, 10) || 0;
    query.slug_content = query.slug_content || '';

    if (
        (isNaN(query.fk_site) || query.fk_site < 1) ||
        ((isNaN(query.pk_content) || query.pk_content < 1) && query.slug_content.length < 1)
    ) {
        next(BadRequestError());
    } else {
        try {
            let data = await contentModel.findOne(query);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

/**
 * @rewrite
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
        next(BadRequestError());
    }
});

/**
 * получение контента
 *
 * @see contentModel.find
 */
router.get('/content', async ({query}, res, next) => {
    // validate
    query.limit = parseInt(query.limit, 10) || 20;
    query.fk_site = parseInt(query.fk_site, 10);
    query.isdeleted = parseInt(query.isdeleted, 10) || -1;
    query.status = parseInt(query.status, 10) || 0;
    query.withcount = parseInt(query.withcount, 10) || 0;
    query.offset = parseInt(query.offset, 10) || 0;

    if (isNaN(query.fk_site) || query.fk_site < 1) {
        next(BadRequestError());
    } else {
        try {
            let data = await contentModel.find(query);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

/**
 * @rewrite
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
        pk_content: parseInt(req.body.content.pk_content, 10),
        later_publish_time: req.body.content.later_publish_time
    };

    let fk_site = parseInt(req.body.fk_site, 10);

    //проверка
    if(content.title_content.length < 1 ||
        content.text_content.length < 1 ||
        (isNaN(content.fk_user_created) || content.fk_user_created < 1) ||
        (isNaN(fk_site) || fk_site < 1)
    ) {
        next(BadRequestError());
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
