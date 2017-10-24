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
    r_content_to_tagsmodel = require('./r_content_to_tags');

mysql.formatBind();

/**
 * создание контента
 *
 * @param {Object} cobj
 *      @param {String} title_content       - заголовок
 *      @param {String} text_content        - содержимое
 *      @param {Array}  tags                - теги
 *      @param {int}    status_content      - статус
 *      @param {int}    fk_user_created     - ид создателя
 *      @param {String} headimgsrc_content   - основное изображение
 *@param {int} fk_site                      - ид сайта
 */
model.save = (cobj, fk_site) => {
    let slug = slugify(cobj.title_content);

    cobj.title_content = entities.encode(cobj.title_content);
    cobj.text_content = entities.encode(cobj.text_content);
    cobj.headimgsrc_content = (cobj.headimgsrc_content.length > 0) ? entities.encode(cobj.headimgsrc_content) : null;

    return new Promise((resolve, reject) => {
        /**resolve({
            pk_content: 1
        });
        return;*/

        //сохранение контента
        model
            .checkUniqSlug(slug)
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
                            let tags_arr = [], tags = [];

                            //собрать все ид, новые послать на сохранение
                            for (let i = 0; i < cobj.tags.length; i++) {
                                let fk_tag = parseInt(cobj.tags[i].id, 10);

                                if (fk_tag === -1) { // создать новый
                                    tags_arr.push(cobj.tags[i].label);
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
                                        .save(row.insertId, tags);
                                })
                                .catch(err => {
                                    errorlog(err);
                                });
                        }
                        //end теги
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
 * @param {String} slug - слаг для сохранения
 */
model.checkUniqSlug = (slug) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `slug_content` FROM `" + TABLE_NAME + "` WHERE `slug_content` LIKE '" + slug + "%'", {
                slug
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
