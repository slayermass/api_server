"use strict";

let model = function(){};

const
    TABLE_NAME = 'content',
    TABLE_NAME_VIEWS = 'content_views',
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
    addWhere = require('../../functions').addWhere,
    uploadFilesModel = require('./upload_files'),
    requestIp = require('request-ip');

mysql.formatBind();

/**
 * поиск, получение контента по ид со всеми полями
 * сначала получить ид контента, если указана метка (+запрос)
 * уменьшение кол-ва запросов, желательно до 1
 *
 * @param {int} fk_site         - ид сайта
 * @param {int} pk_content      - ид контента
 * @param {String} slug_content - метка контента
 * @param {Object} params       - доп параметры
 *      {int} withimages        - включить ли изображения галерей
 *      {bool} wlc              - не проваливаться внутрь, отмена рекурсивного поиска связанных новостей(друг на друга)
 */
model.findOne = (fk_site, pk_content, slug_content, params = {}) => {
    return new Promise((resolve, reject) => {
        model
            .findPkBySlug(fk_site, pk_content, slug_content)
            .then(pk_content => {
                return new Promise((resolve, reject) => {
                    async.parallel({
                        content_data: (callback) => { //основная инфа
                            // не выбраны еще основные поля выборки
                            mysql
                                .getSqlQuery("SELECT `pk_content`, `title_content`, `slug_content`," +
                                    " `headimgsrc_content`, `intro_content`, `text_content`, `create_date`," +
                                    " `status_content`, `fk_user_created`, count(ip) AS views" +
                                    " FROM `" + TABLE_NAME + "`" +
                                    " LEFT JOIN `" + TABLE_NAME_VIEWS + "` ON `pk_content` = `fk_content`" +
                                    " WHERE `fk_site` = :fk_site AND `pk_content` = :pk_content", {
                                    fk_site,
                                    pk_content
                                })
                                .then(rows => {
                                    callback(null, rows[0]);
                                })
                                .catch(err => {
                                    if (err === EMPTY_SQL) {
                                        callback(null, {});
                                    } else {
                                        callback(err);
                                    }
                                });
                        },
                        content_tags: (callback) => { //теги
                            mysql
                                .getSqlQuery("SELECT `pk_tag`, `name_tag` FROM `r_content_to_tags` LEFT JOIN `tags` ON tags.pk_tag = fk_tag WHERE `fk_content` = :pk_content", {
                                    pk_content
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
                        }
                    }, (err, results) => {
                        if (err) {
                            errorlog(err);
                            return reject(err);
                        }

                        //если есть данные - собрать в однотипное представление данных
                        if (!empty(results.content_data)) {
                            results.content_data.tags = [];

                            for (let i = 0; i < results.content_tags.length; i++) {
                                results.content_data.tags.push({
                                    id: results.content_tags[i].pk_tag,
                                    label: results.content_tags[i].name_tag
                                });
                            }
                        }

                        resolve(results.content_data);
                    });
                });
            })
            .then(data => { // найти изображения галерей
                return new Promise((resolve) => {
                    if (params.withimages > 0) {
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

                                resolve({
                                    data,
                                    images: ret_images
                                });
                            })
                            .catch(() => { // ошибка - слать ответ
                                resolve({
                                    data,
                                    images: {}
                                });
                            });
                    } else {
                        resolve({data});
                    }
                });
            })
            .then(data => { // найти связанные новости
                if (params.wlc === false) {
                    resolve(data.data);
                } else {
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
                                function (callback) {
                                    model
                                        .findOne(fk_site, widget_lc_ids[i], slug_content, {
                                            withimages: 0,
                                            wlc: false
                                        }) // быстрое решение рекурсии
                                        .then(data => {
                                            callback(null, {data});
                                        })
                                        .catch(err => {
                                            callback(err)
                                        });
                                }
                            );
                        }

                        // получить все синхронно
                        async.parallel(farr, (err, results) => {
                            if (err) {
                                resolve({
                                    data: data.data,
                                    images: data.images,
                                });
                            }

                            let result_lc = {};

                            for (let i = 0; i < results.length; i++) {
                                result_lc[results[i].data.pk_content] = results[i].data;
                            }

                            resolve({
                                data: data.data,
                                images: data.images,
                                linked_content: result_lc
                            });
                        });
                    } else {
                        resolve({
                            data: data.data,
                            images: data.images,
                        });
                    }
                }
            })
            .catch(err => {
                errorlog(err);
                return reject(err);
            });
    });
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
                .getSqlQuery("SELECT `pk_content` FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `slug_content` = :slug_content", {
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
 * удаление контента по ид
 *
 * @param {Array} delArr - массив ид контента
 */
model.delete = (delArr) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("DELETE FROM `" + TABLE_NAME + "` WHERE `pk_content` IN(" + delArr.join(',') + ")", {})
            .then(rows => {
                resolve({
                    deleted: rows.affectedRows
                });
            })
            .catch(err => {
                reject(err);
            });
    });
};

/**
 * поиск, получение контента
 *
 * @param {int} fk_site         - ид сайта
 * @param {Object} params       - параметры
 *      @param {int} limit      - кол-во записей для поиска
 *      @param {int} offset     - отступ для поиска
 *      @param {int} orderby    - сортировка
 *      @param {int} isdeleted  - выводить удаленные(0 - нет, 1 - да, -1 - все)
 *      @param {int} status     - статус контента
 * @param {Object} search       - пользовательский поиск по параметрам {val: значение, type: тип поля}
 * @param {int} withcount       - включить ли вывод кол-ва записей}
 */
model.find = (fk_site, params, search, withcount) => {
    let add_where = addWhere(search),
        leftJoin = '';

    // указан статус
    if (params.status !== 0) {
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
                        " ORDER BY " + params.orderby + " LIMIT :limit OFFSET :offset"
                        , {
                            fk_site,
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
                if (withcount === 1) {
                    mysql
                        .getSqlQuery("SELECT COUNT(*) AS count, " +
                            "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site) AS countstatus0, " +
                            "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `status_content` = 1) AS countstatus1, " +
                            "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `status_content` = 2) AS countstatus2, " +
                            "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `status_content` = 3) AS countstatus3 " +
                            "FROM `" + TABLE_NAME + "`", {
                            fk_site
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
 *      @param {int}    pk_content          - ид контента (новый или пересохранять)
 *      @param {timestamp} later_publish_time - дата/время отложенной публикации
 * @param {int} fk_site                     - ид сайта
 */
model.update = (cobj, fk_site) => {
    let slug = slugify(cobj.title_content);

    cobj.title_content = entities.encode(cobj.title_content);
    cobj.text_content = entities.encode(cobj.text_content);
    cobj.intro_content = entities.encode(cobj.intro_content);
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

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `pk_content` = :pk_content", {
                fk_site,
                pk_content: cobj.pk_content
            })
            .then(row => {
                model
                    .checkUniqSlug(slug, fk_site, [row[0].slug_content])
                    .then(slug => {

                        mysql
                            .getSqlQuery("UPDATE `" + TABLE_NAME + "` SET `title_content` = :title_content, `slug_content` = :slug, " +
                                "`headimgsrc_content` = :headimgsrc_content, `text_content` = :text_content, `status_content` = :status_content, " +
                                "`fk_user_updated` = :fk_user_updated, `update_date` = :update_date, `intro_content` = :intro_content " +
                                add_sql +
                                "WHERE `pk_content` = :pk_content"
                                , {
                                    title_content: cobj.title_content,
                                    slug,
                                    intro_content: cobj.intro_content,
                                    text_content: cobj.text_content,
                                    headimgsrc_content: cobj.headimgsrc_content,
                                    status_content: cobj.status_content,
                                    fk_user_updated: cobj.fk_user_created,
                                    update_date: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
                                    pk_content: cobj.pk_content,
                                    publish_date
                                })
                            .then(row => {
                                resolve({
                                    pk_content: row.insertId
                                });

                                //сохранение тегов позже
                                if (cobj.tags) {
                                    model.saveTags(fk_site, cobj.tags, cobj.pk_content);
                                }
                            })
                            .catch(err => {
                                reject(err);
                            });
                    });
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
 * @param {Object} cobj
 *      @param {String} title_content       - заголовок
 *      @param {String} text_content        - содержимое
 *      @param {String} intro_content       - краткое содержимое(введение)
 *      @param {Array}  tags                - теги
 *      @param {int}    status_content      - статус
 *      @param {int}    fk_user_created     - ид создателя
 *      @param {String} headimgsrc_content  - основное изображение
 *      @param {timestamp} later_publish_time - дата/время отложенной публикации
 * @param {int} fk_site                     - ид сайта
 */
model.save = (cobj, fk_site) => {
    let slug = slugify(cobj.title_content);

    cobj.title_content = entities.encode(cobj.title_content);
    cobj.text_content = entities.encode(cobj.text_content);
    cobj.intro_content = entities.encode(cobj.intro_content);
    cobj.headimgsrc_content = (cobj.headimgsrc_content.length > 0) ? entities.encode(cobj.headimgsrc_content) : null;

    if (cobj.intro_content.length === 0) {
        cobj.intro_content = null;
    }

    let publish_date = null;

    if (cobj.status_content === 3) {
        publish_date = cobj.later_publish_time;
    }

    return new Promise((resolve, reject) => {
        //сохранение контента
        model
            .checkUniqSlug(slug, fk_site)
            .then(slug => {
                mysql
                    .getSqlQuery("INSERT INTO `" + TABLE_NAME + "`(`title_content`, `slug_content`, `headimgsrc_content`, `intro_content`, `text_content`, `fk_site`, `status_content`, `fk_user_created`, `publish_date`)" +
                        " VALUES (:title_content, :slug, :headimgsrc_content, :intro_content, :text_content, :fk_site, :status_content, :fk_user_created, :publish_date);", {
                        title_content: cobj.title_content,
                        slug,
                        text_content: cobj.text_content,
                        intro_content: cobj.intro_content,
                        headimgsrc_content: cobj.headimgsrc_content,
                        fk_site,
                        status_content: cobj.status_content,
                        fk_user_created: cobj.fk_user_created,
                        publish_date
                    })
                    .then(row => {
                        resolve({
                            pk_content: row.insertId
                        });

                        //сохранение тегов позже
                        if(cobj.tags) {
                            model.saveTags(fk_site, cobj.tags, row.insertId);
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
 */
model.checkUniqSlug = (slug, fk_site, ignored_slugs = []) => {
    let ignore_slugs = ignored_slugs.join(',');

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `slug_content` FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `slug_content` LIKE '" + slug + "%' AND `slug_content` NOT IN(:ignore_slugs)", {
                ignore_slugs,
                fk_site
            })
            .then(rows => {
                let uniqnum = 0;

                //проверять, если число - увеличивать, если нет - неважно, может там другая строка начинается с этого слага
                for (let i = 0; i < rows.length; i++) {
                    let sp = rows[i].slug_content.split('-');
                    let num = parseInt(sp[sp.length - 1], 10);

                    if (isNaN(num)) {
                        continue;
                    }

                    uniqnum = ++num;
                }

                slug = `${slug}-${uniqnum}`;

                resolve(slug);
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
 * set once a day?
 *
 * @param {int} fk_site         - ид сайта
 * @param {int} pk_content      - ид контента или
 * @param {String} slug_content - slug content
 */
model.incrViews = (fk_site, pk_content, slug_content, req) => {
    const ip = requestIp.getClientIp(req);

    return new Promise((resolve, reject) => {
        model
            .findPkBySlug(fk_site, pk_content, slug_content)
            /**.then(pk_content => {
                mysql // SELECT INET6_NTOA(ip)
                    .getSqlQuery("SELECT INET6_NTOA(ip), timestamp FROM `" + TABLE_NAME_VIEWS + "`" +
                        " WHERE `ip` = INET6_ATON(:ip) AND `fk_content` = :pk_content" +
                        " AND `timestamp` <= :timestamp;", {
                        pk_content,
                        ip          : ip.address(),
                        timestamp   : moment(Date.now()).subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss')
                    })
                    .then(data => {
                        console.log(data, moment(Date.now()).subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss'));
                        resolve(true);
                    })
                    .catch(() => {
                        resolve(false);
                    });
            })*/
            .then(pk_content => {
                mysql // SELECT INET6_NTOA(ip)
                    .getSqlQuery("INSERT INTO `" + TABLE_NAME_VIEWS + "` VALUES (:pk_content, INET6_ATON(:ip), NULL)", {
                        pk_content,
                        ip
                    })
                    .then(() => {
                        resolve(true);
                    })
                    .catch(() => {
                        resolve(false);
                    });
            })
            .catch(err => {
                reject(false);
            });
    });
};

module.exports = model;
