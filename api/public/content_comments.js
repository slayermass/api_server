const router = require('express').Router();
const BadRequestError = require('../../functions').BadRequestError;
const model = require('../../models/mysql/content_comments');
const Entities = require('html-entities').XmlEntities;
const entities = new Entities();

/**
 * сохранение/создание комментария
 *
 * @see model.
 */
router.post('/comment', async (req, res, next) => {
    let {body} = req;

    body.fk_site = parseInt(body.fk_site, 10);
    body.fk_content = parseInt(body.fk_content, 10);
    body.text_comment = entities.encode(body.text_comment);
    body.name_author_comment = entities.encode(body.name_author_comment);

    if(isNaN(body.fk_site) || body.fk_site < 1
        || isNaN(body.fk_content) || body.fk_content < 1
        || body.text_comment.length === 0 || body.name_author_comment.length === 0) {
        next(BadRequestError());
    } else {
        try {
            let data = await model.save(body);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

module.exports = router;
