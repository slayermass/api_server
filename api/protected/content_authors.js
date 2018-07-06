// добавлять/удалять авторов текста
const router = require('express').Router();
const model = require('../../models/mysql/content_authors');
const BadRequestError = require('../../functions').BadRequestError;

/**
 * вывод авторов
 * @see model.getList
 */
router.get('/content_authors/list', async (req, res, next) => {
    const fk_site = parseInt(req.query.fk_site, 10);

    if (isNaN(fk_site) || fk_site < 1) {
        next(BadRequestError());
    } else {
        let data = await model.getList(fk_site);

        res.send({
            data,
            count: data.length
        });
    }
});

/**
 * создание автора
 * + проверка при создании
 *
 * @see model.add
 */
router.post('/content_authors', async ({body}, res, next) => {
    body.fk_site = parseInt(body.fk_site, 10);
    body.pk_content_author = parseInt(body.pk_content_author, 10);

    if (isNaN(body.fk_site) || body.fk_site < 1
        || isNaN(body.pk_content_author) || body.pk_content_author < 1
        || !body.lastname_content_author.length
        || !body.name_content_author.length
        || !body.secondname_content_author.length
    ) {
        next(BadRequestError());
    } else {
        let success = await model.add(body);

        res.send(success);
    }
});

module.exports = router;
