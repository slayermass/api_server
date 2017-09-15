"use strict";

let tags = function(){};

const
    TABLE_NAME = 'tags',
    mysql = require('../../db/mysql'),
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    errorlog = require('../../functions').error,
    async = require('async'),
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL;

mysql.formatBind();

/**
 * создание тега
 * проверка существования
 *
 * @param {Array} tags - названия тегов
 * @param {int} fk_site - ид ресурса
 */
tags.checkSave = (tags, fk_site) => {
    let farr = [];

    for(let i = 0; i < tags.length; i++) {
        let name_tag = entities.encode(tags[i]);

        farr.push(
            function (callback) {
                mysql
                    .getSqlQuery("SELECT `pk_tag` FROM `" + TABLE_NAME + "` WHERE `name_tag` = :name_tag AND `fk_site` = :fk_site;", {
                        name_tag,
                        fk_site
                    })
                    .then(row => {
                        callback(null, {
                            pk_tag: row[0].pk_tag,
                            name_tag
                        });
                    })
                    .catch(err => {
                        if (err === EMPTY_SQL) { // не найдено
                            mysql
                                .getSqlQuery("INSERT INTO `" + TABLE_NAME + "`(`name_tag`, `fk_site`) VALUES (:name_tag, :fk_site);", {
                                    name_tag,
                                    fk_site
                                })
                                .then(row => {
                                    callback(null, {
                                        pk_tag: row.insertId,
                                        name_tag
                                    });
                                })
                                .catch(err => {
                                    errorlog(err);
                                    callback(err)
                                });
                        } else {
                            errorlog(err);
                            callback(err);
                        }
                    });
            });
    }

    //динамический параллельный
    return new Promise((resolve, reject) => {
        async.parallel(farr, (err, results) => {
            if(err) reject();
            resolve(results);
        });
    });
};

/**
 * получить теги
 *
 * @param {int} fk_site - ид ресурса
 * @param {int} limit   - кол-во тегов
 */
tags.getAllBySite = (fk_site, limit) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `pk_tag`, `name_tag` FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site ORDER BY `pk_tag` DESC LIMIT :limit;", {
                fk_site,
                limit
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                if(err === EMPTY_SQL) {
                    resolve();
                } else {
                    errorlog(err);
                    reject();
                }
            });
    });
};

module.exports = tags;
