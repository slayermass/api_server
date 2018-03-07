const router = require('express').Router(),
    functions = require('../../functions'),
    BadRequestError = require('../../functions').BadRequestError,
    decodeHtml = require('../../functions').decodeHtml,
    model = require('../../models/mysql/content'),
    uploadFilesModel = require('../../models/mysql/upload_files');

/**
 * getting content for public site (index page)
 *
 * @see model.find
 */
router.get('/content', (req, res, next) => {
    let limit = parseInt(req.query.limit, 10) || 20,
        fk_site = parseInt(req.query.fk_site, 10),
        isdeleted = parseInt(req.query.isdeleted, 10) || -1,
        status = parseInt(req.query.status, 10) || 0,
        orderby = (req.query.orderby) ? req.query.orderby : 'pk_content DESC',
        withcount = parseInt(req.query.withcount, 10) || 0,
        offset = parseInt(req.query.offset, 10) || 0,
        name_tag = req.query.name_tag,
        search = req.query.search || {};

    if (isNaN(fk_site) || fk_site < 1) {
        next(BadRequestError());
    } else {
        model
            .find(fk_site, {
                limit,
                orderby,
                isdeleted,
                status,
                offset,
                name_tag
            }, search, withcount)
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                next(err);
            });
    }
});

/**
 * getting content for public site by slug
 *
 * + sets a view
 *
 * @see contentModel.findOne
 */
router.get('/contentone', (req, res, next) => {
    let fk_site = parseInt(req.query.fk_site, 10),
        pk_content = parseInt(req.query.pk_content, 10),
        slug_content = req.query.slug_content,
        withimages = parseInt(req.query.withimages, 10) || 0; // найти ид файлов и выдать ссылки на них вместе c результатом

    if (
        (isNaN(fk_site) || fk_site < 1) ||
        ((isNaN(pk_content) || pk_content < 1) && slug_content.length < 1)
    ) {
        next(BadRequestError());
    } else {
        model
            .findOne(fk_site, pk_content, slug_content)
            .then(data => {
                if (withimages > 0) {
                    const ids = getIdsFromShortcodes(data.text_content);

                    // дождаться инфы о файлах и отправить ответ
                    uploadFilesModel
                        .findApi(fk_site, 0, ids)
                        .then(images => {
                            let ret_images = {};

                            for (let i = 0; i < images.length; i++) {
                                // pk_file можно удалить
                                ret_images[images[i].pk_file] = images[i];
                            }

                            res.send({
                                data,
                                images: ret_images
                            });
                        })
                        .catch(() => { // ошибка - слать ответ
                            res.send({
                                data,
                                images: {}
                            });
                        });

                } else {
                    res.send({
                        data
                    });
                }

                model.incrViews(fk_site, pk_content, slug_content);
            })
            .catch(err => {
                next(err);
            });
    }
});

module.exports = router;

/**
 * вычленять из текста куски шорткодов(файлы, изображения)
 *
 * @param {HTML} html
 * @returns {Array}
 */
function getIdsFromShortcodes(html) {
    let return_ids = [];

    html = decodeHtml(html);

    if (html.includes('[gallery')) {
        // обычно в теге <p> tinymce создает
        html.replace(/<p>\[gallery([^\]]*)\]<\/p>/g, (all, ids) => {
            ids = ids.split('"');
            ids = ids[1].split(',');

            for (let i = 0; i < ids.length; i++) {
                return_ids.push(parseInt(ids[i], 10));
            }
        });
    }

    return return_ids;
}
