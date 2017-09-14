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
 */
tags.checkSave = (tags) => {
    let farr = [];

    for(let i = 0; i < tags.length; i++) {
        let name_tag = entities.encode(tags[i]);

        farr.push(
            function (callback) {
                mysql
                    .getSqlQuery("SELECT `pk_tag` FROM `" + TABLE_NAME + "` WHERE `name_tag` = :name_tag;", {
                        name_tag: name_tag
                    })
                    .then(row => {
                        callback(null, {
                            pk_tag: row[0].pk_tag,
                            name_tag: name_tag
                        });
                    })
                    .catch(err => {
                        if (err === EMPTY_SQL) { // не найдено
                            mysql
                                .getSqlQuery("INSERT INTO `" + TABLE_NAME + "`(`name_tag`) VALUES (:name_tag);", {
                                    name_tag: name_tag
                                })
                                .then(row => {
                                    callback(null, {
                                        pk_tag: row.insertId,
                                        name_tag: name_tag
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

module.exports = tags;
