const router = require('express').Router(),
    contentModel = require('../../models/mysql/content');

/**
 * создание контента
 *
 * @see contentModel.save
 */
router.post('/content', (req, res, next) => {
    let content= {
            title_content: req.body.content.title,
            text_content: req.body.content.text,
            tags: req.body.content.tags,
            status_content: parseInt(req.body.content.status, 10),
            fk_user_created: parseInt(req.body.content.fk_user_created, 10),
            headimgsrc_content: req.body.content.head_img_src
        };
    let fk_site = parseInt(req.body.fk_site, 10);

    //проверка
    if(content.title_content.length < 1 ||
        content.text_content.length < 1 ||
        (isNaN(content.fk_user_created) || content.fk_user_created < 1) ||
        fk_site < 1
    ) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
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
