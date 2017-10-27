"use strict";

let model = function(){};

const
    TABLE_NAME = 'content',
    mysql = require('../../db/mysql'),
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    errorlog = require('../../functions').error,
    async = require('async'),
    slugify = require('transliteration').slugify,
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL,
    tagsmodel = require('./tags'),
    moment = require('moment'),
    r_content_to_tagsmodel = require('./r_content_to_tags');

mysql.formatBind();

/**
 * поиск, получение контента по ид со всеми полями
 *
 * @param {int} pk_content      - ид контента
 * @param {int} fk_site         - ид сайта
 */
model.findOne = (pk_content, fk_site) => {
    return new Promise((resolve, reject) => {
        async.parallel({
            content_data: (callback) => { //основная инфа
                mysql
                    .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `pk_content` = :pk_content", {
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

            //собрать в однотипное представление данных
            results.content_data.tags = [];

            for (let i = 0; i < results.content_tags.length; i++) {
                results.content_data.tags.push({
                    id: results.content_tags[i].pk_tag,
                    label: results.content_tags[i].name_tag
                });
            }

            resolve(results.content_data);
        });
    });
};

/**
 * поиск, получение контента
 *
 * @param {int} fk_site         - ид сайта
 * @param {Object} params       - параметры
 *      @param {int} limit      - кол-во записей для поиска
 *      @param {int} orderby    - сортировка
 *      @param {int} isdeleted  - выводить удаленные(0 - нет, 1 - да, -1 - все)
 */
model.find = (fk_site, params) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `pk_content`, `title_content`, `slug_content`, `create_date`, `update_date`, `fk_user_created`, `fk_user_updated`, `status_content`, `isdeleted` " +
                "FROM `" + TABLE_NAME + "` " +
                "WHERE `fk_site` = :fk_site AND `isdeleted` = :isdeleted " +
                "ORDER BY " + params.orderby + " LIMIT :limit"
                , {
                    fk_site,
                    limit: params.limit,
                    isdeleted: params.isdeleted
                })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                if (err === EMPTY_SQL) {
                    resolve({});
                } else {
                    errorlog(err);
                    reject(err);
                }
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
 *      @param {Array}  tags                - теги
 *      @param {int}    status_content      - статус
 *      @param {int}    fk_user_created     - ид создателя
 *      @param {String} headimgsrc_content  - основное изображение
 *      @param {int}    pk_content          - ид контента (новый или пересохранять)
 * @param {int} fk_site                     - ид сайта
 */
model.update = (cobj, fk_site) => {
    let slug = slugify(cobj.title_content);

    cobj.title_content = entities.encode(cobj.title_content);
    cobj.text_content = entities.encode(cobj.text_content);
    cobj.headimgsrc_content = (cobj.headimgsrc_content.length > 0) ? entities.encode(cobj.headimgsrc_content) : null;

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
                                "`fk_user_updated` = :fk_user_updated, `update_date` = :update_date " +
                                "WHERE `pk_content` = :pk_content"
                                , {
                                    title_content: cobj.title_content,
                                    slug,
                                    text_content: cobj.text_content,
                                    headimgsrc_content: cobj.headimgsrc_content,
                                    status_content: cobj.status_content,
                                    fk_user_updated: cobj.fk_user_created,
                                    update_date: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
                                    pk_content: cobj.pk_content
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
                                errorlog(err);
                                reject(err);
                            });
                    });
            })
            .catch(err => {
                errorlog(err);
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
 *      @param {Array}  tags                - теги
 *      @param {int}    status_content      - статус
 *      @param {int}    fk_user_created     - ид создателя
 *      @param {String} headimgsrc_content  - основное изображение
 * @param {int} fk_site                     - ид сайта
 */
model.save = (cobj, fk_site) => {
    let slug = slugify(cobj.title_content);

    cobj.title_content = entities.encode(cobj.title_content);
    cobj.text_content = entities.encode(cobj.text_content);
    cobj.headimgsrc_content = (cobj.headimgsrc_content.length > 0) ? entities.encode(cobj.headimgsrc_content) : null;

    return new Promise((resolve, reject) => {
        //сохранение контента
        model
            .checkUniqSlug(slug, fk_site)
            .then(slug => {
                mysql
                    .getSqlQuery("INSERT INTO `" + TABLE_NAME + "`(`title_content`, `slug_content`, `headimgsrc_content`, `text_content`, `fk_site`, `status_content`, `fk_user_created`)" +
                        " VALUES (:title_content, :slug, :headimgsrc_content, :text_content, :fk_site, :status_content, :fk_user_created);", {
                        title_content: cobj.title_content,
                        slug,
                        text_content: cobj.text_content,
                        headimgsrc_content: cobj.headimgsrc_content,
                        fk_site,
                        status_content: cobj.status_content,
                        fk_user_created: cobj.fk_user_created
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
                        errorlog(err);
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
            .getSqlQuery("SELECT `slug_content` FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site `slug_content` LIKE '" + slug + "%' AND `slug_content` NOT IN(:ignore_slugs)", {
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

module.exports = model;
