const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/mysql/content'),
    empty = require('is-empty'),
    errorlog = require('../../functions').error;

/**
 * getting a content for public site (index page)
 *
 * @see model.findPublic
 */
router.get('/content', async (req, res, next) => {
    let {query} = req;

    // validate
    query.limit = parseInt(query.limit, 10) || 20;
    query.fk_site = parseInt(query.fk_site, 10);
    query.withcount = parseInt(query.withcount, 10) || 0;
    query.offset = parseInt(query.offset, 10) || 0;
    query.chosen = parseInt(query.chosen, 10) || 0;
    query.id_rubric = parseInt(query.id_rubric, 10) || 0;
    query.select = (!empty(query.select)) ? query.select.split(',') : []; // только определенные поля на выбор

    if (isNaN(query.fk_site) || query.fk_site < 1 || query.select.length === 0) {
        next(BadRequestError());
    } else {
        try {
            let data = await model.findPublic(query);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

/**
 * getting a content for public site by slug or pk_content
 *
 * + sets a view
 *
 * @see contentModel.findOne
 */
router.get('/contentone', async (req, res, next) => {
    let query = req.query;

    // validate
    query.fk_site = parseInt(query.fk_site, 10);
    query.pk_content = parseInt(query.pk_content, 10) || 0;
    query.slug_content = query.slug_content || '';
    query.withimages = parseInt(query.withimages, 10) || 0; // (0,1) найти ид файлов и выдать ссылки на них вместе c результатом

    if (
        (isNaN(query.fk_site) || query.fk_site < 1) ||
        ((isNaN(query.pk_content) || query.pk_content < 1) && query.slug_content.length < 1)
    ) {
        next(BadRequestError());
    } else {
            try {
                let data = await model.findOnePublic(query);

                res.send(data);
            } catch (err) {
                next(err);
            }

        // увеличить просмотр
        model.incrViews(query.fk_site, query.pk_content, query.slug_content, req);
    }
});

/**
 * check if has content, get limited by id last news
 *
 * @see contentModel.isGetContentNew
 */
router.get('/iscontentnew', async (req, res, next) => {
    // validate
    const fk_site = parseInt(req.query.fk_site, 10);
    const pk_content = parseInt(req.query.pk_content, 10);
    let limit = parseInt(req.query.limit, 10) || 20;

    limit = (limit > 20) ? 20 : limit;

    if (isNaN(fk_site) || isNaN(pk_content) || pk_content < 1 || fk_site < 1) {
        next(BadRequestError());
    } else {
        try {
            let data = await model.isGetContentNew(fk_site, pk_content, limit);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});




/**
 * тест загрузки изображений, для синхронизации
 * TODO УДАЛИТЬ после переноса
 */
const upload_files = require('../../models/mysql/upload_files');

router.post('/contenttest', async (req, res, next) => {
    let link = req.body.link,
        domain = req.body.domain,
        files = req.body.files,
        fk_site = parseInt(req.body.fk_site, 10);

    if (isNaN(fk_site) || fk_site < 1) {
        next(BadRequestError());
    } else {
        for(let i = 0; i < files.length; i ++) {
            console.log(`${domain}${files[i].path}`);

            upload_files
                .newByLink(fk_site, `${domain}${files[i].path}`, '');
        }

        res.json({success: true});
    }
});

/**
 * загрузка новостей, обработка и превращение в контент
 * { tags: '1,15',
  content: '<p>lorem inpus</p>',
  title: 'Заголовок',
  create_date: '2018-06-18 17:35:16',
  author_id: '19',
  status: '2',
  id_news: '104697',
  type_code: '10' }
 */

const Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    mysql = require('../../db/mysql');

mysql.formatBind();

router.post('/contenttestcontent', async (req, res, next) => {
    const data = req.body.data;
    const domain = req.body.domain;
    const fk_site = parseInt(req.body.fk_site, 10);
    const toupdate = parseInt(req.body.update, 10);

    if (isNaN(fk_site) || fk_site < 1) {
        next(BadRequestError());
    } else {
        const slug_content = data.id_news;
        const id_news_old = data.id_news;
        const title_content = data.title;
        const text_content = entities.encode(data.content);
        const create_date = data.create_date;
        let publish_date = data.date;
        const fk_user_created = switchUser(data.author_id);
        const status_content = data.status;
        const is_enabled_comments = data.comments;
        let tags = data.tags;
        if(tags.length) tags = tags.split(',');

        let fk_material_rubric = 1;

        switch (data['type_code']) {
            case 2:
                fk_material_rubric = 2;
                break;
            case 3:
                fk_material_rubric = 3;
                break;
            case 9:
                fk_material_rubric = 4;
                break;
        }

        if(publish_date.length < 2) publish_date = create_date;

        console.log(data, toupdate);

        // создать
        if(toupdate === 0) {
            mysql
                .getSqlQuery("INSERT INTO `content` " +
                    "(`title_content`, `slug_content`, `text_content`, `id_news_old`, " +
                    " `fk_site`, `status_content`, `fk_user_created`, `publish_date`," +
                    " `fk_material_rubric`, `create_date`, `is_enabled_comments`)" +
                    " VALUES (:title_content, :slug_content, :text_content, :id_news_old," +
                    " :fk_site, :status_content, :fk_user_created, :publish_date," +
                    " :fk_material_rubric, :create_date, :is_enabled_comments);", {
                    title_content,
                    slug_content,
                    text_content,
                    id_news_old,
                    fk_site,
                    status_content,
                    fk_user_created,
                    publish_date,
                    fk_material_rubric,
                    create_date,
                    is_enabled_comments
                })
                .then(row => {
                    console.log('вставлено');

                    // вставка тегов
                    for(let i = 0; i < tags.length; i++) {
                        if(isNaN(Number(tags[i]))) { // создать тег
                            mysql
                                .getSqlQuery("INSERT INTO `tags` (`name_tag`, `fk_site`) VALUES (:name_tag, :fk_site);",{
                                    fk_site,
                                    name_tag: tags[i]
                                })
                                .then(data => {
                                    mysql
                                        .getSqlQuery("INSERT INTO `r_content_to_tags` (`fk_content`, `fk_tag`) VALUES (:fk_content, :fk_tag)",{
                                            fk_content: row.insertId,
                                            fk_tag: data.insertId
                                        })
                                        .then(() => {
                                            console.log('r_content_to_tags вставлен');
                                        })
                                        .catch(err => {
                                            console.log('insert tag error: ',err);
                                        });
                                })
                                .catch(err => {
                                    console.log('create tag error: ', err);
                                });
                        } else { // вставить тег
                            mysql
                                .getSqlQuery("SELECT pk_tag FROM tags WHERE old_tag_id = :pk_tag AND fk_site = :fk_site;",{
                                    fk_site,
                                    pk_tag: tags[i]
                                })
                                .then(data => {
                                    mysql
                                        .getSqlQuery("INSERT INTO `r_content_to_tags` (`fk_content`, `fk_tag`) VALUES (:fk_content, :fk_tag)",{
                                            fk_content: row.insertId,
                                            fk_tag: data[0].pk_tag
                                        })
                                        .then(() => {
                                            console.log('r_content_to_tags вставлен');
                                        })
                                        .catch(err => {
                                            console.log('insert tag error: ',err);
                                        });
                                })
                                .catch(err => {

                                });
                        }
                    }
                    // end вставка тегов
                })
                .catch(err => {
                    console.log('проблемы с вставкой', err);
                });
        } else { // обновить
            mysql
                .getSqlQuery("UPDATE `content` SET `title_content` = :title_content, `slug_content` = :slug_content, " +
                    " `text_content` = :text_content, `status_content` = :status_content, " +
                    " `fk_material_rubric` = :fk_material_rubric, `is_enabled_comments` = :is_enabled_comments " +
                    " WHERE `id_news_old` = :id_news_old;"
                    , {
                        title_content,
                        slug_content,
                        text_content,
                        id_news_old,
                        fk_site,
                        status_content,
                        fk_user_created,
                        publish_date,
                        fk_material_rubric,
                        create_date,
                        is_enabled_comments
                    })
                .then(() => {
                    console.log('обновлено');

                    // вставка тегов
                    if(tags.length >= 1) {
                        mysql
                            .getSqlQuery("SELECT `pk_content` FROM content WHERE `id_news_old` = :id_news_old;", {
                                id_news_old
                            })
                            .then(data => {
                                const fk_content = data[0].pk_content;

                                mysql
                                    .getSqlQuery("DELETE FROM `r_content_to_tags` WHERE `fk_content` = :fk_content;", {
                                        fk_content: fk_content
                                    })
                                    .then(() => {
                                        console.log('теги удалены');

                                        for (let i = 0; i < tags.length; i++) {
                                            if (isNaN(Number(tags[i]))) { // создать тег
                                                mysql
                                                    .getSqlQuery("INSERT INTO `tags` (`name_tag`, `fk_site`) VALUES (:name_tag, :fk_site);", {
                                                        fk_site,
                                                        name_tag: tags[i]
                                                    })
                                                    .then(data => {
                                                        mysql
                                                            .getSqlQuery("INSERT INTO `r_content_to_tags` (`fk_content`, `fk_tag`) VALUES (:fk_content, :fk_tag)", {
                                                                fk_content: fk_content,
                                                                fk_tag: data.insertId
                                                            })
                                                            .then(() => {
                                                                console.log('r_content_to_tags вставлен');
                                                            })
                                                            .catch(err => {
                                                                console.log('insert tag error: ', err);
                                                            });
                                                    })
                                                    .catch(err => {
                                                        console.log('create tag error: ', err);
                                                    });
                                            } else { // вставить тег
                                                mysql
                                                    .getSqlQuery("SELECT pk_tag FROM tags WHERE old_tag_id = :pk_tag AND fk_site = :fk_site;", {
                                                        fk_site,
                                                        pk_tag: tags[i]
                                                    })
                                                    .then(data => {
                                                        mysql
                                                            .getSqlQuery("INSERT INTO `r_content_to_tags` (`fk_content`, `fk_tag`) VALUES (:fk_content, :fk_tag)", {
                                                                fk_content: fk_content,
                                                                fk_tag: data[0].pk_tag
                                                            })
                                                            .then(() => {
                                                                console.log('r_content_to_tags вставлен');
                                                            })
                                                            .catch(err => {
                                                                console.log('insert tag error: ', err);
                                                            });
                                                    })
                                                    .catch(err => {
                                                        console.log('find tag error: ', err);
                                                    });
                                            }
                                        }
                                    }).catch(err => {
                                });
                                // end вставка тегов
                            }).catch(err => {
                        });
                    }
                })
                .catch(err => {
                    console.log('проблемы с обновлением ', err);
                });
        }



        res.json({success: true});
    }
});

function switchUser(id) {
    // 170 - ид главного редактора сейчас

    let arr = {1 : 170, 3 : 19, 4 : 331, 5 : 322, 10 : 279, 11 : 403, 13 : 39, 14 : 415,
        15 : 414, 16 : 104, 17 : 2, 19 : 413, 20 : 430, 21 : 144, 22 : 151,
        23 : 473, 24 : 494, 25 : 507, 26 : 522, 27 : 24, 28 : 555, 29 : 567, 30 : 170, 32: 170
    };

    if(!id) return 170;
    return arr[id];
}

module.exports = router;
