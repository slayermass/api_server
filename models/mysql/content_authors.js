"use strict";

let model = function(){};

const
    TABLE_NAME = 'content_authors',
    mysql = require('../../db/mysql'),
    errorlog = require('../../functions').error,
    empty = require('is-empty');

mysql.formatBind();

/**
 * вывод спика авторов
 * @param {int} fk_site - ид ресурса
 * @returns {Promise<void>}
 */
model.getList = async (fk_site) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "`  WHERE `fk_site` = :fk_site " +
                " ORDER BY `pk_content_author` DESC;", {
                fk_site
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

/**
 * создание автора
 * + проверка при создании
 *
 * @param fk_site
 */
model.add = async (params) => {
    let isAuthor = await new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "`  WHERE `fk_site` = :fk_site AND `pk_content_author` = :pk_content_author" +
                " ORDER BY `pk_content_author` DESC;", {
                fk_site : params.fk_site,
                pk_content_author: params.pk_content_author
            })
            .then(rows => {
                if(empty(rows)) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            })
            .catch(err => {
                errorlog(err);
                reject(false);
            });
    });

    if(!isAuthor) {
        let success = await new Promise((resolve, reject) => {
            mysql
                .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` " +
                    " (`pk_content_author`, `lastname_content_author`, `name_content_author`, `secondname_content_author`, `fk_site`)" +
                    " VALUES (:pk_content_author, :lastname_content_author, :name_content_author, :secondname_content_author, :fk_site) ;", {
                    fk_site: params.fk_site,
                    pk_content_author: params.pk_content_author,
                    lastname_content_author: params.lastname_content_author,
                    name_content_author: params.name_content_author,
                    secondname_content_author: params.secondname_content_author
                })
                .then(() => {
                    resolve(true);
                })
                .catch(err => {
                    errorlog(err);
                    reject(false);
                });
        });

        return {success};
    }

    return {success:'exists'};
};

module.exports = model;
