const router = require('express').Router(),
    doArray = require('../../functions').doArray,
    BadRequestError = require('../../functions').BadRequestError,
    contentModel = require('../../models/mysql/content');

/**
 * getting content for public site by slug or pk_content
 *
 * @see contentModel.findOne
 */
router.get('/contentone', async (req, res, next) => {
    let {query} = req;

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
 * удаление контента по ид
 *
 * @see contentModel.delete
 */
router.delete('/content', async (req, res, next) => {
    let delArr = doArray(req.body.delArr);

    if (delArr.length) {
        try {
            let count = await contentModel.delete(delArr);

            res.send({
                success: true,
                count
            });
        } catch (err) {
            next(err);
        }
    } else {
        next(BadRequestError());
    }
});

/**
 * получение контента
 *
 * @see contentModel.find
 */
router.get('/content', async (req, res, next) => {
    let {query} = req;

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
    let {body} = req;
    let content = {};

    try {
        // validate
        body.fk_site = parseInt(body.fk_site, 10);
        content = {
            title_content: body.content.title,
            text_content: body.content.text,
            intro_content: body.content.intro,
            tags: body.content.tags,
            status_content: parseInt(body.content.status, 10) || 2,
            fk_user_created: parseInt(body.content.fk_user_created, 10),
            headimgsrc_content: body.content.head_img_src,
            pk_content: parseInt(body.content.pk_content, 10),
            later_publish_time: body.content.later_publish_time,
            type_material: parseInt(body.content.type_material, 10)
        };
    } catch (e) {
        next(BadRequestError());
        return;
    }

    //проверка
    if(content.title_content.length < 1 ||
        content.text_content.length < 1 ||
        (isNaN(content.fk_user_created) || content.fk_user_created < 1) ||
        (isNaN(body.fk_site) || body.fk_site < 1) ||
        content.type_material < 1 ||
        content.intro_content.length < 1
    ) {
        next(BadRequestError());
    } else if (content.pk_content) { //редактирование
        contentModel
            .update(content, body.fk_site)
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
            .save(content, body.fk_site)
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
