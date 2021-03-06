"use strict";

let model = function(){};

const
    TABLE_NAME = 'content',
    TABLE_NAME_VIEWS = 'content_views',
    TABLE_NAME_HISTORY = 'content_history',
    TABLE_NAME_TAGS = require('../../models/mysql/tags').getTableName(),
    TABLE_NAME_RUBRIC = require('../../models/mysql/content_material_rubric').getTableName(),
    TABLE_NAME_R_CONTENT_TO_TAGS = require('../../models/mysql/r_content_to_tags').getTableName(),
    TABLE_NAME_CONTENT_COMMENTS = require('../../models/mysql/content_comments').getTableName(),
    TABLE_NAME_R_CONTENT_TO_CONTENT_STORIES = require('./r_content_to_content_stories').getTableName(),
    TABLE_NAME_CONTENT_STORIES = require('./content_stories').getTableName(),
    mysql = require('../../db/mysql'),
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    errorlog = require('../../functions').error,
    decodeHtml = require('../../functions').decodeHtml,
    getIdsFromShortcodes = require('../../functions').getIdsFromShortcodes,
    async = require('async'),
    slugify = require('transliteration').slugify,
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL,
    tagsmodel = require('./tags'),
    moment = require('moment'),
    empty = require('is-empty'),
    r_content_to_tagsmodel = require('./r_content_to_tags'),
    r_content_to_content_stories = require('./r_content_to_content_stories'),
    addWhere = require('../../functions').addWhere,
    uploadFilesModel = require('./upload_files'),
    contentCommentsModel = require('./content_comments'),
    sphinxModel = require('../sphinx/content_search');

mysql.formatBind();

/**
 * поиск, получение контента по ид со всеми полями
 * сначала получить ид контента, если указана метка (+запрос)
 * уменьшение кол-ва запросов, желательно до 1
 *
 * @param {Object} params            - доп параметры
 *      @param {int} fk_site         - ид сайта - required
 *      @param {int} pk_content      - ид контента
 *      @param {String} slug_content - метка контента
 *      @param {int} withimages      - включить ли изображения галерей(0,1)
 *      @param {bool} wlc            - (true)не проваливаться внутрь, отмена рекурсивного поиска связанных новостей(друг на друга)
 */
model.findOne = async (params) => {
    let data = {}; // основной объект ответа, дополняющийся данными

    // найти основные данные
    const pk_content = await model.findPkBySlug(params.fk_site, params.pk_content, params.slug_content);

    if (params.wlc === undefined) {
        params.wlc = false;
    }

    try {
        let [content_data, content_tags, content_stories] = await Promise.all([
            await mysql
                .getSqlQuery("SELECT *, count(ip) AS views" +
                    " FROM `" + TABLE_NAME + "`" +
                    " LEFT JOIN `" + TABLE_NAME_VIEWS + "` ON `pk_content` = `fk_content`" +
                    " WHERE `fk_site` = :fk_site AND `pk_content` = :pk_content", {
                    fk_site: params.fk_site,
                    pk_content
                }),
            await mysql
                .getSqlQuery("SELECT `pk_tag`, `name_tag` FROM `" + TABLE_NAME_R_CONTENT_TO_TAGS + "`" +
                    " LEFT JOIN `tags` ON tags.pk_tag = fk_tag " +
                    " WHERE `fk_content` = :pk_content", {
                    pk_content
                }),
            await mysql
                .getSqlQuery("SELECT `pk_content_story`, `title_content_story` FROM `" + TABLE_NAME_R_CONTENT_TO_CONTENT_STORIES + "`" +
                    " LEFT JOIN `" + TABLE_NAME_CONTENT_STORIES + "` ON `" + TABLE_NAME_CONTENT_STORIES + "`.`pk_content_story` = `fk_content_stories` " +
                    " WHERE `fk_content` = :pk_content", {
                    pk_content
                })
        ]);

        content_data = content_data[0];

        // добавить теги
        if (!empty(content_data)) {
            content_data.tags = [];

            for (let i = 0; i < content_tags.length; i++) {
                content_data.tags.push({
                    id: content_tags[i].pk_tag,
                    label: content_tags[i].name_tag
                });
            }
        }

        content_tags = null;
        // end добавить теги

        // добавить сюжеты
        if (!empty(content_data)) {
            content_data.content_stories = [];

            for (let i = 0; i < content_stories.length; i++) {
                content_data.content_stories.push({
                    id: content_stories[i].pk_content_story,
                    label: content_stories[i].title_content_story
                });
            }
        }
        // end добавить сюжеты

        data.data = content_data;
        content_data = null;
        // end найти основные данные
    } catch (err) {
        if (err === EMPTY_SQL) {
            return {};
        } else {
            throw new Error(err);
        }
    }

    // ДОПОЛНИТЕЛЬНЫЕ поля, при проблемах получения которых не должно падать выполнение

    // найти изображения галерей
    if (params.withimages > 0) {
        try {
            const ids = getIdsFromShortcodes(data.data.text_content);

            let images = await uploadFilesModel.findApi(params.fk_site, 0, ids);

            let ret_images = {};

            for (let i = 0; i < images.length; i++) {
                // pk_file можно удалить
                ret_images[images[i].pk_file] = images[i];
            }

            data.images = ret_images;
        } catch (err) {

        }
    }
    // end найти изображения галерей

    // найти историю изменений контента
    if (params._withhistory) {
        try {
            data.history = await model.findHistory(pk_content);
        } catch (err) {

        }
    }
    // end найти историю изменений контента

    return data;
};

/**
 * find pk of content by slug
 * returns faster if pk already set
 *
 * @param {int} fk_site - required
 * @param pk_content
 * @param slug_content
 * @returns {Promise}
 */
model.findPkBySlug = (fk_site, pk_content, slug_content) => {
    return new Promise((resolve, reject) => {
        if (!isNaN(pk_content) && pk_content >= 1) {
            resolve(pk_content);
        } else {
            mysql
                .getSqlQuery("SELECT `pk_content` FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `slug_content` = :slug_content;", {
                    fk_site,
                    slug_content: entities.encode(slug_content)
                })
                .then(rows => {
                    resolve(rows[0].pk_content);
                })
                .catch(() => {
                    reject();
                });
        }
    });
};

/**
 * полное физическое удаление контента по ид
 *
 * @param {Array} delArr - массив ид контента
 */
model.delete = (delArr) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("DELETE FROM `" + TABLE_NAME + "` WHERE `pk_content` IN(" + delArr.join(',') + ")", {})
            .then(rows => {
                resolve(rows.affectedRows);

                // удалить из поиска
                sphinxModel.deleteByIdPolitsibru(delArr);
            })
            .catch(err => {
                reject(err);
            });
    });
};

/**
 * поиск, получение контента
 *
 * @param {Object} params       - параметры
 *      @param {int} fk_site    - ид сайта (@required)
 *      @param {int} limit      - кол-во записей для поиска
 *      @param {int} offset     - отступ для поиска
 *      @param {int} orderby    - сортировка
 *      @param {int} isdeleted  - выводить удаленные(0 - нет, 1 - да, -1 - все)
 *      @param {int} status     - статус контента (0 - весь)
 *      @param {Object} search  - пользовательский поиск по параметрам {val: значение, type: тип поля}
 *      @param {int} withcount  - включить ли вывод кол-ва записей}
 */
model.find = (params) => {
    let add_where = addWhere(params.search),
        leftJoin = '',
        orderby = (params.orderby) ? params.orderby : 'pk_content DESC';

    // указан статус
    if (params.status > 0) {
        add_where += ' AND `status_content` = :status_content';
    }

    // указан удаленность контента
    if (params.isdeleted !== -1) {
        add_where += ' AND `isdeleted` = :isdeleted';
    }

    // поиск по метке тегов, джойн через таблицы тегов и связей-тегов
    if (!empty(params.name_tag)) {
        leftJoin = 'LEFT JOIN `' + r_content_to_tagsmodel.getTableName() + '` ON `pk_content` = `fk_content`' +
            'LEFT JOIN `' + tagsmodel.getTableName() + '` ON `fk_tag` = `pk_tag`';

        add_where += ' AND name_tag = :name_tag';
    }

    return new Promise((resolve, reject) => {
        async.parallel({
            content_data: (callback) => { //основная инфа
                mysql
                    .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "`" + leftJoin +
                        " WHERE `" + TABLE_NAME + "`.`fk_site` = :fk_site " + add_where +
                        " ORDER BY " + orderby + " LIMIT :limit OFFSET :offset"
                        , {
                            fk_site: params.fk_site,
                            limit: params.limit,
                            isdeleted: params.isdeleted,
                            status_content: params.status,
                            offset: params.offset,
                            name_tag: entities.encode(params.name_tag)
                        })
                    .then(rows => {
                        callback(null, rows);
                    })
                    .catch(err => {
                        if (err === EMPTY_SQL) {
                            callback(null, {});
                        } else {
                            callback(err);
                        }
                    });
            },
            content_count: (callback) => { //кол-во записей
                if (params.withcount === 1) {
                    mysql
                        .getSqlQuery("SELECT COUNT(*) AS count, " +
                            "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site) AS countstatus0, " +
                            "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `status_content` = 1) AS countstatus1, " +
                            "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `status_content` = 2) AS countstatus2, " +
                            "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `status_content` = 3) AS countstatus3 " +
                            "FROM `" + TABLE_NAME + "`", {
                            fk_site: params.fk_site,
                            })
                        .then(row => {
                            callback(null, {
                                countstatus0: row[0].countstatus0,
                                countstatus1: row[0].countstatus1,
                                countstatus2: row[0].countstatus2,
                                countstatus3: row[0].countstatus3
                            });
                        })
                        .catch(err => {
                            callback(err);
                        });
                } else {
                    callback(null, {});
                }
            }
        }, (err, results) => {
            if (err) {
                errorlog(err);
                return reject(err);
            }

            resolve({
                data: results.content_data,
                count: results.content_count
            });
        });
    });
};

/**
 * редактирование контента
 * найти для сравнения и обновлять
 *
 * @param {Object} cobj
 *      @param {String} title_content       - заголовок
 *      @param {String} text_content        - содержимое
 *      @param {String} intro_content       - краткое содержимое(введение)
 *      @param {Array}  tags                - теги
 *      @param {int}    status_content      - статус
 *      @param {int}    fk_user_created     - ид создателя
 *      @param {String} headimgsrc_content  - основное изображение
 *      @param {String} headimglabel_content  - подпись к основному изображению
 *      @param {int}    pk_content          - ид контента (новый или пересохранять)
 *      @param {timestamp} later_publish_time - дата/время отложенной публикации
 *      @param {int}    is_chosen           - избранная ли новость
 *      @param {int}    fk_material_rubric  - рубрика контента
 *      @param {int}    exclude_rss_yandex  - исключить из яндекс rss?
 *      @param {String} caption_content     - подпись фото, видео, ссылка
 * @param {int} fk_site                     - ид сайта
 */
model.update = async (cobj, fk_site) => {
    // зачем менять slug при обновлении? он же уже уникальный при создании
    // ответ - если меняется заголовок. сейчас отключено и никак не обрабатывается
    // меняет ссылку, особенно у старых новостей - 10000 => vlasti-barnaula-gotovy-potratit-na-ozelenenie-80-mln-rubley
    // let slug = slugify(cobj.title_content);

    cobj.title_content = entities.encode(cobj.title_content);
    cobj.seo_title_content = entities.encode(cobj.seo_title_content);
    cobj.text_content = entities.encode(cobj.text_content);
    cobj.intro_content = entities.encode(cobj.intro_content);
    cobj.caption_content = entities.encode(cobj.caption_content) || null;
    cobj.headimglabel_content = entities.encode(cobj.headimglabel_content) || null;
    cobj.headimgsrc_content = (cobj.headimgsrc_content.length > 0) ? entities.encode(cobj.headimgsrc_content) : null;

    if (cobj.intro_content.length === 0) {
        cobj.intro_content = null;
    }

    // изменить дату отложенной публикации
    let publish_date = null,
        add_sql = '';

    if (cobj.status_content === 3) {
        publish_date = cobj.later_publish_time;
        add_sql = ', `publish_date` = :publish_date ';
    }

    if (cobj.is_chosen) {
        add_sql += ', `is_chosen` = :is_chosen ';

        await model.unsetChosen(fk_site);
    }

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("UPDATE `" + TABLE_NAME + "` SET `title_content` = :title_content," +
                " `seo_title_content` = :seo_title_content, `headimgsrc_content` = :headimgsrc_content," +
                " `text_content` = :text_content, `status_content` = :status_content, " +
                " `fk_user_updated` = :fk_user_updated, `update_date` = :update_date, `intro_content` = :intro_content, " +
                " `fk_material_type` = :fk_material_type, `headimglabel_content` = :headimglabel_content, " +
                " `fk_material_rubric` = :fk_material_rubric, `exclude_rss_yandex` = :exclude_rss_yandex," +
                " `caption_content` = :caption_content " +
                add_sql +
                "WHERE `pk_content` = :pk_content"
                , {
                    title_content       : cobj.title_content,
                    intro_content       : cobj.intro_content,
                    text_content        : cobj.text_content,
                    headimgsrc_content  : cobj.headimgsrc_content,
                    status_content      : cobj.status_content,
                    fk_user_updated     : cobj.fk_user_created,
                    update_date         : moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
                    pk_content          : cobj.pk_content,
                    publish_date,
                    fk_material_type    : cobj.type_material,
                    headimglabel_content: cobj.headimglabel_content,
                    seo_title_content   : cobj.seo_title_content,
                    is_chosen           : cobj.is_chosen,
                    fk_material_rubric  : cobj.fk_material_rubric,
                    exclude_rss_yandex  : cobj.exclude_rss_yandex,
                    caption_content     : cobj.caption_content
                })
            .then(row => {
                resolve({
                    pk_content: row.insertId
                });

                //сохранение тегов позже
                if (cobj.tags) {
                    model.saveTags(fk_site, cobj.tags, cobj.pk_content);
                }

                // сохранение сюжетов
                r_content_to_content_stories.save(fk_site, cobj.pk_content, cobj.content_stories);
            })
            .catch(err => {
                reject(err);
            });
    });
};

/**
 * сохранение тегов и связей с контентом
 *
 * @param {int} fk_site     - ид сайта
 * @param {Array} ctags     - массив тегов
 * @param {int} fk_content  - ид контента
 */
model.saveTags = (fk_site, ctags, fk_content) => {
    let tags_arr = [], tags = [];

    //собрать все ид, новые послать на сохранение
    for (let i = 0; i < ctags.length; i++) {
        let fk_tag = parseInt(ctags[i].id, 10);

        if (fk_tag === -1) { // создать новый
            tags_arr.push(ctags[i].label);
        } else {
            tags.push(fk_tag);
        }
    }

    tagsmodel
        .checkSave(fk_site, tags_arr)
        .then(data => {
            for (let i = 0; i < data.length; i++) {
                tags.push(data[i].pk_tag);
            }

            r_content_to_tagsmodel
                .save(fk_content, tags);
        })
        .catch(err => {
            errorlog(err);
        });
};


/**
 * создание контента
 *
 * очевидно нужен async/await
 *
 * @param {Object} cobj
 *      @param {String} title_content       - заголовок
 *      @param {String} text_content        - содержимое
 *      @param {String} intro_content       - краткое содержимое(введение)
 *      @param {Array}  tags                - теги
 *      @param {int}    status_content      - статус
 *      @param {int}    fk_user_created     - ид создателя
 *      @param {String} headimgsrc_content  - основное изображение
 *      @param {String} headimglabel_content  - подпись к основному изображению
 *      @param {timestamp} later_publish_time - дата/время отложенной публикации
 *      @param {int}    type_material          - тип материала
 *      @param {int}    is_chosen              - избранная ли новость
 *      @param {int}    fk_material_rubric  - рубрика контента
 *      @param {int}    exclude_rss_yandex  - исключить из яндекс rss?
 *      @param {String} caption_content     - подпись фото, видео, ссылка
 * @param {int} fk_site                     - ид сайта
 */
model.save = async (cobj, fk_site) => {
    let slug = slugify(cobj.title_content);

    cobj.title_content = entities.encode(cobj.title_content);
    cobj.seo_title_content = entities.encode(cobj.seo_title_content);
    cobj.text_content = entities.encode(cobj.text_content);
    cobj.intro_content = entities.encode(cobj.intro_content);
    cobj.caption_content = entities.encode(cobj.caption_content) || null;
    cobj.headimglabel_content = entities.encode(cobj.headimglabel_content) || null;
    cobj.headimgsrc_content = (cobj.headimgsrc_content && cobj.headimgsrc_content.length > 0) ? entities.encode(cobj.headimgsrc_content) : null;

    if (cobj.intro_content.length === 0) {
        cobj.intro_content = null;
    }

    // publish_date должен быть явно указан
    let publish_date;

    if (cobj.status_content === 3) {
        publish_date = cobj.later_publish_time;
    } else { // это не нормально, но быстрое решение
        const date = new Date();
        let month = date.getMonth() + 1;
            month = (month > 9) ? month : '0' + month;
        const day = (date.getDate() > 9) ? date.getDate() : '0'+date.getDate();
        const hours = (date.getHours() > 9) ? date.getHours() : '0'+date.getHours();
        const minutes = (date.getMinutes() > 9) ? date.getMinutes() : '0'+date.getMinutes();
        const seconds = (date.getSeconds() > 9) ? date.getSeconds() : '0'+date.getSeconds();

        publish_date = date.getFullYear() + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
    }
    // end publish_date должен быть явно указан


    if (cobj.is_chosen) {
        await model.unsetChosen(fk_site);
    }

    return new Promise((resolve, reject) => {
        //сохранение контента
        model
            .checkUniqSlug(slug, fk_site, [], true)
            .then(slug => {
                mysql
                    .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` " +
                        "(`title_content`, `seo_title_content`, `slug_content`, `headimgsrc_content`, `intro_content`, `text_content`," +
                        " `fk_site`, `status_content`, `fk_user_created`, `publish_date`, `fk_material_type`," +
                        " `headimglabel_content`, `is_chosen`, `fk_material_rubric`, `exclude_rss_yandex`, `caption_content`)" +
                        " VALUES (:title_content, :seo_title_content, :slug, :headimgsrc_content, :intro_content, :text_content," +
                        " :fk_site, :status_content, :fk_user_created, :publish_date, :fk_material_type," +
                        " :headimglabel_content, :is_chosen, :fk_material_rubric, :exclude_rss_yandex, :caption_content);", {
                        title_content       : cobj.title_content,
                        slug,
                        text_content        : cobj.text_content,
                        intro_content       : cobj.intro_content,
                        headimgsrc_content  : cobj.headimgsrc_content,
                        fk_site,
                        status_content      : cobj.status_content,
                        fk_user_created     : cobj.fk_user_created,
                        publish_date,
                        fk_material_type    : cobj.type_material,
                        headimglabel_content: cobj.headimglabel_content,
                        seo_title_content   : cobj.seo_title_content,
                        is_chosen           : cobj.is_chosen,
                        fk_material_rubric  : cobj.fk_material_rubric,
                        exclude_rss_yandex  : cobj.exclude_rss_yandex,
                        caption_content     : cobj.caption_content
                    })
                    .then(row => {
                        mysql
                            .getSqlQuery("SELECT `slug_content` FROM `" + TABLE_NAME + "` WHERE `pk_content` = :pk_content;",{
                                pk_content: row.insertId
                            })
                            .then(rows => {
                                resolve({
                                    pk_content  : row.insertId,
                                    slug_content: rows[0].slug_content
                                });
                            })
                            .catch(() => {
                                resolve({
                                    pk_content: row.insertId
                                });
                            });

                        // сохранение тегов позже
                        if (cobj.tags && cobj.tags.length >= 1) {
                            model.saveTags(fk_site, cobj.tags, row.insertId);
                        }

                        // сохранение сюжетов
                        r_content_to_content_stories.save(fk_site, row.insertId, cobj.content_stories);

                        if(cobj.status_content === 1) {
                            // найти время публикации и добавить в поиск
                            mysql
                                .getSqlQuery("SELECT `publish_date` FROM `" + TABLE_NAME + "`" +
                                    " WHERE `pk_content` = :pk_content;",{
                                    pk_content: row.insertId
                                })
                                .then(rows => {
                                    sphinxModel.addByIdPolitsibru({
                                        pk_content      : row.insertId,
                                        title_content   : cobj.title_content,
                                        text_content    : cobj.text_content,
                                        publish_date    : rows[0].publish_date
                                    });
                                })
                                .catch(() => {
                                    reject();
                                });
                        }
                    })
                    .catch(err => {
                        reject(err);
                    });
            });
    });
};

/**
 * проверка и создание уникального слага
 *
 * @param {String} slug         - слаг для сохранения
 * @param {int} fk_site         - ид сайта(уникальный в рамках сайта)
 * @param {Array} ignored_slugs - слаги для игнора(например при сохранении проверять все, но не сохраняемый) необяз
 * @param {boolean} findAll     - искать ли полное совпадение(для сохранения уж точно)
 */
model.checkUniqSlug = (slug, fk_site, ignored_slugs = [], findAll = false) => {
    let ignore_slugs = ignored_slugs.join(',');
    let add_sql = '';

    if(!findAll) {
        add_sql = ' AND `slug_content` NOT IN(:ignore_slugs)';
    }

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `slug_content` FROM `" + TABLE_NAME + "`" +
                " WHERE `fk_site` = :fk_site AND `slug_content` LIKE '" + slug + "%' " + add_sql + ';', {
                ignore_slugs,
                fk_site
            })
            .then(rows => {
                // новый алгоритм
                let slugs_diff_arr = [];
                // дальше может получиться что и нет, но если найдены значения, значит надо менять слаг
                let hasRows = rows.length > 0;

                // найти разницу между всеми похожими слагами и сделать еще один, отличный от всех
                // т.к. логика = добавление числа через '-', то все без '-' тоже можно отсеивать
                // для test отсеивать testo, testovyy, брать для сравнения test-1, test-vagon
                // с помощью регулярки конечно умнее
                for (let i = 0; i < rows.length; i++) {
                    if(rows[i].slug_content.includes(slug)) {
                        let rep = rows[i].slug_content.replace(slug, ''); // замена полного вхождения

                        // интересны только числовые окончания
                        if(rep.length && rep.startsWith('-') && /^-\d+$/.test(rep)) {
                            slugs_diff_arr.push(Math.abs(+rep));
                        }
                    }
                }

                // может и быть первым и точным совпадением, поэтому начальное значение - 0
                let biggestNumberPostfix = 0;

                if(slugs_diff_arr.length) {
                    // максимальное существующее значение
                    biggestNumberPostfix = slugs_diff_arr.sort()[slugs_diff_arr.length-1];
                }

                // увеличить число, склеить и вернуть
                if(hasRows) { // всегда если что-нибудь найдено
                    resolve(`${slug}-${++biggestNumberPostfix}`);
                } else {
                    resolve(slug);
                }
            })
            .catch(() => { // все нормально - не найдено похожих
                resolve(slug);
            });
    });
};

/**
 * sets an increment view for content
 * allows to do any logic
 *
 * to set once a day?
 *
 * @param {int} fk_site         - ид сайта
 * @param {int} pk_content      - ид контента или
 * @param {String} slug_content - slug content
 * @param {Object} ip           - ip адрес с фронтенда
 */
model.incrViews = async (fk_site, pk_content, slug_content, ip) => {
    if(empty(ip)) return false;

    //const ip = requestIp.getClientIp(req);

    try {
        let pk_content_found = await model.findPkBySlug(fk_site, pk_content, slug_content);

        let is = await mysql // SELECT INET6_NTOA(ip)
            .getSqlQuery("SELECT `fk_content` FROM `" + TABLE_NAME_VIEWS + "` " +
                "WHERE `ip` = INET6_ATON(:ip) AND `fk_content` = :pk_content AND STR_TO_DATE(`timestamp`, \"%Y-%m-%d\") = CURDATE();", {
                pk_content: pk_content_found,
                ip
            });

        // нет записей
        if(is.length === undefined) {
            await mysql
                .getSqlQuery("INSERT INTO `" + TABLE_NAME_VIEWS + "` VALUES (:pk_content, INET6_ATON(:ip), NOW())", {
                    pk_content: pk_content_found,
                    ip
                });
        }

        return true;
    } catch (err) {
        return false;
    }
};

/**
 * обновление контента с отложенной публикацией (опубликован)
 * для регулярного вызова
 *
 * @returns {Promise}
 */
model.checkPublishUpdate = async () => {
    const publish_date = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');

    // найти заранее все информацию
    let published_arr = await new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `pk_content`, `title_content`, `text_content`, `publish_date` FROM `" + TABLE_NAME + "`" +
                " WHERE `status_content` = 3 AND `publish_date` <= :publish_date;", {
                publish_date
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(() => {
                reject();
            });
    });

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("UPDATE `" + TABLE_NAME + "` SET `status_content` = 1 WHERE `status_content` = 3 AND `publish_date` <= :publish_date;", {
                publish_date
            })
            .then(data => {
                resolve(data.affectedRows);

                for(let i = 0; i < published_arr.length; i++) {
                    sphinxModel.addByIdPolitsibru({
                        pk_content      : published_arr[i].pk_content,
                        title_content   : published_arr[i].title_content,
                        text_content    : published_arr[i].text_content,
                        publish_date    : published_arr[i].publish_date
                    });
                }
            })
            .catch(() => {
                reject();
            });
    });
};

/**
 * сохранение истории редактирования контента
 * сохраняет полную копию в JSON
 * можно посмотреть что именно сохранять, а что игнорировать. пока так
 *
 * дубликаты при сохранении?
 *
 * @param {Object} content - объект контента с фронтенда
 * @returns {Promise<void>}
 */
model.saveHistory = (content) => {
    let {pk_content} = content;
    delete content.pk_content;

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("INSERT INTO `" + TABLE_NAME_HISTORY + "` (`fk_content`, `json_data`) VALUES (:fk_content, :json_data);", {
                fk_content: pk_content,
                json_data: JSON.stringify(content)
            })
            .then(() => {
                resolve();
            })
            .catch(() => {
                reject();
            });
    });
};

/**
 * получение истории (всей) по ид контента
 *
 * @param {int} fk_content  - ид контента
 * @param {Boolean} onlyDate - только дату(true) или все данные (false)
 */
model.findHistory = (fk_content, onlyDate = true) => {
    let select = '`fk_history_content`, `timestamp`';

    if (!onlyDate) {
        select += ', `json_data`';
    }

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT " + select + " FROM `" + TABLE_NAME_HISTORY + "` WHERE `fk_content` = :fk_content;", {
                fk_content
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(() => {
                reject();
            });
    });
};

/**
 * private
 *
 * убрать все метки избранных с новостей, только 1 избранная может быть
 *
 * @param {int} fk_site    - ид сайта
 */
model.unsetChosen = (fk_site) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("UPDATE `" + TABLE_NAME + "` SET `is_chosen` = 0 WHERE `is_chosen` = 1 AND `pk_content` > 0" +
                " AND `fk_site` = :fk_site;", {
                fk_site
            })
            .then(() => {
                resolve(true);
            })
            .catch(() => {
                reject();
            });
    });
};

/**
 * get a table name of a model
 * @returns {string}
 */
model.getTableName = () => {
    return TABLE_NAME;
};

/** -------- PUBLIC ---------- */

/**
 * Найти контент для фронтенда
 *
 * надо тестировать жестко
 * + рефактор кода, надо переделывать уже точно
 *
 * @param {Object} params       - параметры
 *      @param {array} select   - массив полей дляgetTableName выборки
 *      @param {int} chosen     - 1-избранные отдельно, 0-все новости по порядку
 *      @param {int} id_rubric  - ид рубрики материала
 *      @param {String} name_tag - метка тега, прям по-русски. надо ее очищать
 *      @param {int} status     - статус контента (0 - весь)
 *      @param {int} withcount  - включить ли вывод кол-ва записей, учитывает входные параметры
 *      @param {int} withcomments    - включить ли вывод комментариев
 *      @param {int} pk_content_story - ид сюжета, 0 если без
 *
 * @returns {Promise<any>}
 */
model.findPublic = async (params) => {
    let orderby = (params.orderby) ? params.orderby : ' `publish_date` DESC ';

    // собрать в обернутую строку
    if(!params.select.includes('pk_content')) params.select.push('pk_content');
    let select = params.select.map(el => `\`${el}\``).join(',');

    // глобально необходимые доп.параметры поиска sql
    let add_sql = '';
    let left_join = '';

    if (params.chosen === 1) {
        add_sql += ' AND `is_chosen` = 0 ';
    }

    if (params.id_rubric > 0) {
        add_sql += ' AND `fk_material_rubric` = :fk_material_rubric ';
    }

    if(!empty(params.name_tag) && params.name_tag.length) { // или поиск по тегам
        add_sql += ' AND `name_tag` = :name_tag ';
        left_join += " LEFT JOIN `" + TABLE_NAME_R_CONTENT_TO_TAGS + "` ON `pk_content` = `fk_content`" +
            " LEFT JOIN `" + TABLE_NAME_TAGS + "` ON `pk_tag` = `fk_tag` ";
    } else if(params.pk_content_story && params.pk_content_story > 0) { // или поиск по сюжетам
        left_join += " LEFT JOIN `" + TABLE_NAME_R_CONTENT_TO_CONTENT_STORIES + "` ON `pk_content` = `fk_content` ";
        add_sql += ' AND `fk_content_stories` = :fk_content_story ';
    }
    // end глобально необходимые доп.параметры поиска sql

    return new Promise((resolve, reject) => {
        async.parallel({
            content_data: (callback) => { //основная инфа
                mysql
                    .getSqlQuery("SELECT " + select + " FROM `" + TABLE_NAME + "`" +
                        left_join +
                        " LEFT JOIN `" + TABLE_NAME_RUBRIC + "` ON `fk_material_rubric` = `pk_material_rubric` " + // if(name_material_rubric) ?
                        " WHERE `" + TABLE_NAME + "`.`fk_site` = :fk_site AND `status_content` = 1 " + add_sql +
                        " ORDER BY " + orderby + " LIMIT :limit OFFSET :offset"
                        , {
                            fk_site             : params.fk_site,
                            limit               : params.limit,
                            offset              : params.offset,
                            fk_material_rubric  : params.id_rubric,
                            name_tag            : params.name_tag,
                            fk_content_story    : params.pk_content_story
                        })
                    .then(rows => {
                        callback(null, rows);
                    })
                    .catch(err => {
                        if (err === EMPTY_SQL) {
                            callback(null, {});
                        } else {
                            callback(err);
                        }
                    });
            },
            content_count: (callback) => { //кол-во записей
                if (params.withcount === 1) {
                    mysql
                        .getSqlQuery("SELECT COUNT(*) AS count, " +
                            "(SELECT COUNT(pk_content) FROM `" + TABLE_NAME + "` " + left_join + " " +
                                "WHERE `" + TABLE_NAME + "`.`fk_site` = :fk_site " + add_sql + ") AS countstatus0, " +
                            "(SELECT COUNT(pk_content) FROM `" + TABLE_NAME + "` " + left_join + " " +
                                "WHERE `" + TABLE_NAME + "`.`fk_site` = :fk_site AND `status_content` = 1 " + add_sql + ") AS countstatus1, " +
                            "(SELECT COUNT(pk_content) FROM `" + TABLE_NAME + "` " + left_join + " " +
                                "WHERE `" + TABLE_NAME + "`.`fk_site` = :fk_site AND `status_content` = 2 " + add_sql + ") AS countstatus2, " +
                            "(SELECT COUNT(pk_content) FROM `" + TABLE_NAME + "` " + left_join + " " +
                                "WHERE `" + TABLE_NAME + "`.`fk_site` = :fk_site AND `status_content` = 3 " + add_sql + ") AS countstatus3 " +
                            "FROM `" + TABLE_NAME + "`;"
                        , {
                            fk_site             : params.fk_site,
                            limit               : params.limit,
                            offset              : params.offset,
                            fk_material_rubric  : params.id_rubric,
                            name_tag            : params.name_tag,
                            fk_content_story    : params.pk_content_story
                        })
                        .then(row => {
                            callback(null, {
                                countstatus0: row[0].countstatus0,
                                countstatus1: row[0].countstatus1,
                                countstatus2: row[0].countstatus2,
                                countstatus3: row[0].countstatus3
                            });
                        })
                        .catch(err => {
                            callback(err);
                        });
                } else {
                    callback(null, {});
                }
            },
            content_chosen: (callback) => { //кол-во записей
                if (params.chosen === 1) {
                    mysql
                        .getSqlQuery("SELECT " + select + ", COUNT(`pk_comment`) AS count_comments FROM `" + TABLE_NAME + "`" +
                            " LEFT JOIN `" + TABLE_NAME_CONTENT_COMMENTS + "` ON `pk_content` = `fk_content` " +
                            " WHERE `" + TABLE_NAME + "`.`fk_site` = :fk_site AND `status_content` = 1 AND `is_chosen` = 1" +
                            " GROUP BY `pk_content` ORDER BY " + orderby + ";"
                            , {
                                fk_site: params.fk_site,
                                limit: params.limit,
                                offset: params.offset
                            })
                        .then(rows => {
                            callback(null, rows);
                        })
                        .catch(err => {
                            if (err === EMPTY_SQL) {
                                callback(null, {});
                            } else {
                                callback(err);
                            }
                        });
                } else {
                    callback(null, {});
                }
            }
        }, async (err, results) => {
            if (err) {
                errorlog(err);
                return reject(err);
            }

            // для всех новостей поиск комментов
            let pk_contents = [];
            // если нет комментов, то отдавать 0
            for(let i = 0; i < results.content_data.length; i ++) {
                pk_contents.push(results.content_data[i].pk_content);
                results.content_data[i].count_comments = 0;
            }

            if(pk_contents.length) {
                let count_comments = await contentCommentsModel.countCommentsByContentIn(pk_contents);

                for (let i = 0; i < results.content_data.length; i++) {
                    results.content_data[i].count_comments = count_comments[results.content_data[i].pk_content] || 0;
                }
            }
            // end для всех новостей


            resolve({
                data: results.content_data,
                count: results.content_count,
                chosen: results.content_chosen
            });
        });
    });
};

/**
 * проверить есть ли новости после данной по времени не pk_content и отдать (limit) штук
 *
 * @param {int} fk_site    - ид сайта
 * @param {int} publish_date - время публикации проверяемой новости
 * @param {int} limit      - ограничение выборки
 * @param {boolean} findnew - искать новые, последние(true) или старые(false) от данного ид
 */
model.getPublicContentOnly = (fk_site, publish_date, limit, findnew = true) => {
    let sql = (findnew) ? '>' : '<';

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `pk_content`, `slug_content`, `headimgsrc_content`, `publish_date`, `title_content`" +
                " FROM `" + TABLE_NAME + "` " +
                " WHERE `publish_date` " + sql + " :publish_date AND `fk_site` = :fk_site AND `status_content` = 1 AND `is_chosen` = 0" +
                " ORDER BY `publish_date` DESC LIMIT :limit;", {
                fk_site,
                publish_date,
                limit
            })
            .then(async rows => {
                // найти кол-во комментариев отдельно
                let pk_contents = [];
                // если нет комментов, то отдавать 0
                for(let i = 0; i < rows.length; i ++) {
                    pk_contents.push(rows[i].pk_content);
                    rows[i].count_comments = 0;
                }

                if(pk_contents.length) {
                    let count_comments = await contentCommentsModel.countCommentsByContentIn(pk_contents);

                    for (let i = 0; i < rows.length; i++) {
                        rows[i].count_comments = count_comments[rows[i].pk_content] || 0;
                    }
                }
                // end найти кол-во комментариев отдельно

                resolve(rows);
            })
            .catch(() => {
                reject();
            });
    });
};

/**
 * поиск, получение контента по ид со всеми полями
 * сначала получить ид контента, если указана метка (+запрос)
 *
 * @param {Object} params            - доп параметры
 *      @param {int} fk_site         - ид сайта - required
 *      @param {int} pk_content      - ид контента
 *      @param {String} slug_content - метка контента
 *      @param {int} withimages      - включить ли изображения галерей(0,1)
 *      @param {int} withcomments    - включить ли вывод комментариев
 *      @param {bool} wlc            - (true)не проваливаться внутрь, отмена рекурсивного поиска связанных новостей(друг на друга)
 */
model.findOnePublic = async (params) => {
    let data = {}; // основной объект ответа, дополняющийся данными

    // найти основные данные
    const pk_content = await model.findPkBySlug(params.fk_site, params.pk_content, params.slug_content);

    if (params.wlc === undefined) {
        params.wlc = false;
    }

    try {
        let [content_data, content_tags] = await Promise.all([
            await mysql
                .getSqlQuery("SELECT `pk_content`, `slug_content`, `title_content`, `publish_date`, `headimgsrc_content`," +
                    " `intro_content`, `fk_user_created`, `fk_material_type`, `text_content`, `name_material_rubric`," +
                    " `caption_content`, count(ip) AS views" +
                    " FROM `" + TABLE_NAME + "`" +
                    " LEFT JOIN `" + TABLE_NAME_VIEWS + "` ON `pk_content` = `fk_content`" +
                    " LEFT JOIN `" + TABLE_NAME_RUBRIC + "` ON `fk_material_rubric` = `pk_material_rubric`" +
                    " WHERE `" + TABLE_NAME + "`.`fk_site` = :fk_site AND `pk_content` = :pk_content", {
                    fk_site: params.fk_site,
                    pk_content
                }),
            await mysql
                .getSqlQuery("SELECT `pk_tag`, `name_tag` FROM `r_content_to_tags` LEFT JOIN `tags` ON tags.pk_tag = fk_tag WHERE `fk_content` = :pk_content", {
                    pk_content
                })
        ]);

        content_data = content_data[0];

        //если есть данные - добавить туда теги
        if (!empty(content_data)) {
            content_data.tags = [];

            for (let i = 0; i < content_tags.length; i++) {
                content_data.tags.push({
                    id: content_tags[i].pk_tag,
                    label: content_tags[i].name_tag
                });
            }
        }

        content_tags = null;
        data.data = content_data;
        content_data = null;
        // end найти основные данные

        // найти связанные новости
        if (params.wlc === false) {
            let html = decodeHtml(data.data.text_content);
            let widget_lc_ids = [];

            // есть связанные новости
            if (html.includes('[widgetLinkedContent')) {
                html.replace(/\[widgetLinkedContent([^\]]*)\]/g, (u, data_widget_lc) => {
                    widget_lc_ids.push(parseInt(data_widget_lc.match(/\d+/)[0], 10));
                });

                let farr = [];

                for (let i = 0; i < widget_lc_ids.length; i++) {
                    farr.push(
                        model
                            .findOnePublic({
                                fk_site     : params.fk_site,
                                pk_content  : widget_lc_ids[i],
                                slug_content: params.slug_content,
                                withimages  : 0,
                                withcomments: 1, // нужно только кол-во комментариев
                                wlc         : true // быстрое решение рекурсии
                            })
                    );
                }

                let results = await Promise.all(farr);

                let result_lc = {};

                for (let i = 0; i < results.length; i++) {
                    result_lc[results[i].data.pk_content] = results[i].data;
                    // дальше пошло плохо
                    result_lc[results[i].data.pk_content].comments = results[i].comments;
                    result_lc[results[i].data.pk_content].author = results[i].author;
                }

                data.linked_content = result_lc;
            }
        }
        // end найти связанные новости
    } catch (err) {
        if (err === EMPTY_SQL) {
            return {};
        } else {
            throw new Error(err);
        }
    }

    // ДОПОЛНИТЕЛЬНЫЕ поля, при проблемах получения которых не должно падать выполнение

    // найти изображения галерей
    if (params.withimages > 0) {
        try {
            const ids = getIdsFromShortcodes(data.data.text_content);

            let images = await uploadFilesModel.findApi(params.fk_site, 0, ids);

            let ret_images = {};

            for (let i = 0; i < images.length; i++) {
                // pk_file можно удалить
                ret_images[images[i].pk_file] = images[i];
            }

            data.images = ret_images;
        } catch (err) {

        }
    }
    // end найти изображения галерей


    // найти комментарии
    if (params.withcomments > 0) {
        try {
            data.comments = await contentCommentsModel.commentsByContent(pk_content);
        } catch (err) {
            data.comments = [];
        }
    }
    // end найти комментарии


    // найти автора контента
    try {
        data.author = {
            lastname    : 'Неизвестно',
            name        : '',
            secondname  : ''
        };

        // вывод автора только авторский материал
        if(data.data.fk_material_type === 3) {
            let user_data = await mysql
                .getSqlQuery("SELECT `lastname_content_author`, `name_content_author`, `secondname_content_author`" +
                    " FROM `content_authors` WHERE `pk_content_author` = :fk_user_created", {
                    fk_site: params.fk_site,
                    fk_user_created: data.data.fk_user_created
                });

            if (user_data.length) {
                data.author = {
                    lastname    : user_data[0].lastname_content_author,
                    name        : user_data[0].name_content_author,
                    secondname  : user_data[0].secondname_content_author
                };
            }
        }

        delete data.data.fk_material_type;
    } catch (err) {
        errorlog(err);

        data.author = {
            lastname    : 'Неизвестно',
            name        : '',
            secondname  : ''
        };
    }

    delete data.data.fk_user_created;
    // end найти автора контента

    return data;
};

/**
 * получение данных для rss
 *
 * @param {int} fk_site - ид сайта - required
 * @param {int} limit   - ограничение выборки
 */
model.rssPublic = async (fk_site, limit) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `pk_content`, `slug_content`, `intro_content`, `text_content`, `publish_date`," +
                    " `title_content`, `headimgsrc_content`" +
                " FROM `" + TABLE_NAME + "` " +
                " WHERE `exclude_rss_yandex` = 0 AND `fk_site` = :fk_site AND `status_content` = 1" +
                " ORDER BY `publish_date` DESC LIMIT :limit;", {
                fk_site,
                limit
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    })
};

module.exports = model;
