const router = require('express').Router();
const BadRequestError = require('../../functions').BadRequestError;
const empty = require('is-empty');
const model = require('../../models/mysql/content_comments');
const Entities = require('html-entities').XmlEntities;
const entities = new Entities();

/**
 * сохранение/создание комментария
 *
 * @see model.
 */
router.post('/comment', async (req, res, next) => {
    let {query} = req;

    query.fk_site = parseInt(query.fk_site, 10);
    query.fk_content = parseInt(query.fk_content, 10);
    query.text_comment = entities.encode(query.text_comment);
    query.name_author_comment = entities.encode(query.name_author_comment);

    if(isNaN(query.fk_site) || query.fk_site < 1
        || isNaN(query.fk_content) || query.fk_content < 1
        || query.text_comment.length === 0 || query.name_author_comment.length === 0) {
        next(BadRequestError());
    } else {
        try {
            let data = await model.save(query);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

module.exports = router;
