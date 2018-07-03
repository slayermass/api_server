const router = require('express').Router(),
    BadRequestError = require('../../functions').BadRequestError,
    model = require('../../models/mysql/content'),
    empty = require('is-empty'),
    PUBLIC_FILES_URL = require('../../functions').PUBLIC_FILES_URL,
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
    query.withcomments = parseInt(query.withcomments, 10) || 0;
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
    let {query} = req;

    // validate
    query.fk_site       = parseInt(query.fk_site, 10);
    query.pk_content    = parseInt(query.pk_content, 10) || 0;
    query.slug_content  = query.slug_content || '';
    query.withimages    = parseInt(query.withimages, 10) || 0; // (0,1) найти ид файлов и выдать ссылки на них вместе c результатом
    query.withcomments  = parseInt(query.withcomments, 10) || 0; // (0,1) добавить ли комментарии

    if (
        (isNaN(query.fk_site) || query.fk_site < 1) ||
        ((isNaN(query.pk_content) || query.pk_content < 1) && query.slug_content.length < 1)
    ) {
        next(BadRequestError());
    } else {
        try {
            let data = await model.findOnePublic(query);

            res.send(data);

            // увеличить просмотр
            model.incrViews(query.fk_site, query.pk_content, query.slug_content, query.ip);
        } catch (err) {
            next(err);
        }
    }
});

/**
 * getting a content for public site
 *
 * @see contentModel.getPublicContentOnly
 */
router.get('/contentonly', async (req, res, next) => {
    // validate
    const fk_site = parseInt(req.query.fk_site, 10);
    const pk_content = parseInt(req.query.pk_content, 10);
    let limit = parseInt(req.query.limit, 10) || 20;
    const findnew = (Number(req.query.findnew) === 1);

    limit = (limit > 20) ? 20 : limit;

    if (isNaN(fk_site) || isNaN(pk_content) || pk_content < 1 || fk_site < 1) {
        next(BadRequestError());
    } else {
        try {
            let data = await model.getPublicContentOnly(fk_site, pk_content, limit, findnew);

            res.send(data);
        } catch (err) {
            next(err);
        }
    }
});

/**
 * получение данных для rss (яндекс)
 */
router.get('/contentrss', async (req, res, next) => {
    const fk_site = parseInt(req.query.fk_site, 10);
    let limit = parseInt(req.query.limit, 10) || 20;
    limit = (limit > 20) ? 20 : limit;

    if (isNaN(fk_site) || fk_site < 1) {
        next(BadRequestError());
    } else {
        try {
            let data = await model.rssPublic(fk_site, limit);

            res.send({data});
        } catch (err) {
            next(err);
        }
    }
});




/**
 * тест загрузки изображений, для синхронизации
 * TODO УДАЛИТЬ после переноса ВСЕ НИЖЕ
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
 * перенос при создании комментариев
 */
router.post('/contentcomment', async (req, res, next) => {
    let id_news = parseInt(req.body.id_news, 10),
        info = req.body.info,
        email = req.body.email,
        text = req.body.text,
        id_comment = parseInt(req.body.id_comment, 10),
        fk_site = parseInt(req.body.fk_site, 10);

    let pk_content = await mysql
            .getSqlQuery("SELECT `pk_content` FROM content WHERE `id_news_old` = :id_news;", {
                id_news
            });
    pk_content = pk_content[0].pk_content;

    let saved = await mysql
        .getSqlQuery("INSERT INTO  `content_comments` (`fk_content`, `text_comment`, `is_active`, `add_info`, `old_id_comment`)" +
            " VALUES (:fk_content, :text_comment, 0, :add_info, :old_id_comment);", {
            fk_content: pk_content,
            text_comment: text,
            old_id_comment: id_comment,
            add_info : JSON.stringify({
                email,
                ip: info
            })
        });

    res.json({success: true});
});

/**
 * сделать коммент активным
 */
router.post('/contentcommentsetactive', async (req, res, next) => {
    let id_comment = parseInt(req.body.id_comment, 10);

    let pk_comment = await mysql
        .getSqlQuery("SELECT `pk_comment` FROM content_comments WHERE `old_id_comment` = :id_comment;", {
            id_comment
        });
    pk_comment = pk_comment[0].pk_comment;

    mysql
        .getSqlQuery("UPDATE content_comments SET is_active = 1 WHERE `pk_comment` = :pk_comment;", {
            pk_comment
        });

    res.json({success: true});
});


/**
 * { image: '/img/2018-06-19/thumbs/720x400/2c2b65ecb50212b2c5b83a80f4d12010.jpg',
  fk_site: 1,
  domain: 'http://politsib.ru/',
  id_news: '104733' }

 */
router.post('/contenttestimage', async (req, res, next) => {
    const image = req.body.image;
    const domain = req.body.domain;
    const fk_site = parseInt(req.body.fk_site, 10);
    const id_news = parseInt(req.body.id_news, 10); // old id

    upload_files
        .newByLink(fk_site, `${domain}${image}`, '')
        .then(() => {
            mysql
                .getSqlQuery("SELECT `name_file` FROM upload_files WHERE `link` LIKE '%"+image+"'")
                .then(data => {
                    mysql
                        .getSqlQuery("UPDATE `content` SET `headimgsrc_content` = :img WHERE `id_news_old` = :id_news",{
                            img: `${PUBLIC_FILES_URL}/papi/upload/f/${data[0].name_file}`,
                            id_news
                        })
                        .then(() => {
                            console.log('главное фото установлено');
                        })
                        .catch(err=>{
                            console.log('проблемы с главным фото', err);
                        });
                }).catch(e=>{});
        }).catch(e => {});

    console.log(req.body);

    res.json({success: true});
});

/**
 * удаление контента, не часто
 */
router.post('/contenttestdelete', async (req, res, next) => {
    const fk_site = parseInt(req.body.fk_site, 10);
    const id_news = parseInt(req.body.id, 10); // old id

    console.log(fk_site, id_news);

    mysql
        .getSqlQuery("DELETE FROM `content` WHERE `id_news_old` = :id_news AND `fk_site` = :fk_site;", {
            id_news,
            fk_site
        })
        .then(() => {
            console.log('удалено: ');
        })
        .catch(err => {
            console.log('ошибка удаления: ',err);
        });

    res.json({success: true});
});

/**
 * загрузка новостей, обработка и превращение в контент
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
        let text_content = entities.encode(data.content);
        const create_date = data.create_date;
        let publish_date = data.date;
        const fk_user_created = switchUser(data.author_id);
        const status_content = data.status;
        const is_enabled_comments = data.comments;
        const exclude_rss_yandex = data.exclude_rss_yandex;
        let tags = data.tags;
        if(tags.length) tags = tags.split(',');

        let fk_material_rubric = 1;

        switch (data['type_code']) {
            case 2:
            case '2':
                fk_material_rubric = 2;
                break;
            case 3:
            case '3':
                fk_material_rubric = 3;
                break;
            case 9:
            case '9':
                fk_material_rubric = 4;
                break;
        }

        if(publish_date.length < 2) publish_date = create_date;

        let fk_content;

        // создать
        if(toupdate === 0) {
            mysql
                .getSqlQuery("INSERT INTO `content` " +
                    "(`title_content`, `slug_content`, `text_content`, `id_news_old`, " +
                    " `fk_site`, `status_content`, `fk_user_created`, `publish_date`," +
                    " `fk_material_rubric`, `create_date`, `is_enabled_comments`, `exclude_rss_yandex`)" +
                    " VALUES (:title_content, :slug_content, :text_content, :id_news_old," +
                    " :fk_site, :status_content, :fk_user_created, :publish_date," +
                    " :fk_material_rubric, :create_date, :is_enabled_comments, :exclude_rss_yandex);", {
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
                    is_enabled_comments,
                    exclude_rss_yandex
                })
                .then(row => {
                    fk_content = row.insertId;
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
                    " `text_content` = :text_content, `status_content` = :status_content, `exclude_rss_yandex` =:exclude_rss_yandex, " +
                    " `fk_material_rubric` = :fk_material_rubric, `is_enabled_comments` = :is_enabled_comments, `publish_date` =:publish_date " +
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
                        is_enabled_comments,
                        exclude_rss_yandex
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
                                fk_content = data[0].pk_content;

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
                            })
                            .catch(err => {
                            });
                    }
                })
                .catch(err => {
                    console.log('проблемы с обновлением ', err);
                });
        }

        // imgs
        text_content = entities.decode(text_content);

        if(/<img.*?src="(.*?)".*?>/gm.test(text_content)) {
            let arr = [];

            text_content.replace(/<img.*?src="(.*?)".*?>/gm, function (s, p) {
                arr.push(p);

                return p;
            });

            let imgs = await findimgs(arr);

            for(let i = 0; i < imgs.length; i++) {
                for(let j = 0; j < imgs[i].length; j++) {
                    text_content = text_content.replace(imgs[i][j].link_orig, `${PUBLIC_FILES_URL}/papi/upload/f/${imgs[i][j].name_file}`);
                }
            }

            mysql.
            getSqlQuery("UPDATE `content` SET `text_content` = :text_content WHERE `pk_content` = :pk_content;"
            , {
                pk_content: fk_content,
                text_content: entities.encode(text_content)
            })
                .then(()=>{
                    console.log('text_content изменен');
                })
                .catch(err =>{
                    console.log('text_content проблемы', err);
                })
        }
        // end imgs

        res.json({success: true});
    }
});

async function findimgs(arr) {
    let sq = [];

    for(let i = 0; i < arr.length; i++) {
        sq.push(
            mysql.
                getSqlQuery("SELECT `name_file`, '"+arr[i]+"' AS `link_orig` FROM `upload_files` WHERE `link` LIKE '%"+arr[i]+"';"
                , {})
        )
    }

    return Promise.all(sq);
}

function switchUser(id) {
    // 170 - ид главного редактора сейчас

    let arr = {1 : 170, 3 : 19, 4 : 331, 5 : 322, 10 : 279, 11 : 403, 13 : 39, 14 : 415,
        15 : 414, 16 : 104, 17 : 2, 19 : 170, 20 : 430, 21 : 144, 22 : 151,
        23 : 473, 24 : 494, 25 : 507, 26 : 522, 27 : 24, 28 : 555, 29 : 567, 30 : 170, 32: 579
    };

    if(!id) return 170;
    return arr[id];
}

module.exports = router;
