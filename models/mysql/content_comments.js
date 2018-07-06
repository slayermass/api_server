"use strict";

let model = function () {};

const
    TABLE_NAME = 'content_comments',
    TABLE_NAME_CONTENT = 'content', // так
    mysql = require('../../db/mysql'),
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    errorlog = require('../../functions').error,
    async = require('async'),
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL,
    addWhere = require('../../functions').addWhere;

mysql.formatBind();

/**
 * get a table name of a model
 * @returns {string}
 */
model.getTableName = () => {
    return TABLE_NAME;
};

/**
 * сохранение(создание) комментария PUBLIC
 *
 * @param {Object} query
 *      @param {int} fk_site - ид ресурса
 *      @param {int} fk_content - ид контента
 *      @param {String} text - текст комментария
 */
model.save = async (query) => {
    const exists_content = await model.checkContent(query.fk_site, query.fk_content);

    if(!exists_content) {
        return {
            success: false,
            exists : false
        };
    }

    try {
        const saved = await mysql
                .getSqlQuery("INSERT INTO  `" + TABLE_NAME + "` (`fk_content`, `text_comment`, `name_author_comment`)" +
                    " VALUES (:fk_content, :text_comment, :name_author_comment);", {
                    text_comment: query.text_comment,
                    fk_content  : query.fk_content,
                    name_author_comment: query.name_author_comment
                });

        return {
            success     : true,
            pk_comment  : saved.insertId
        };
    } catch (err) {
        errorlog(err);
        throw new Error(err);
    }
};

/**
 * проверка существования контента
 *
 * @param {int} fk_site     - ид ресурса
 * @param {int} fk_content  - ид контента
 */
model.checkContent = async (fk_site, fk_content) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT EXISTS(SELECT `pk_content` FROM `" + TABLE_NAME_CONTENT + "`" +
                " WHERE `fk_site` = :fk_site AND `pk_content` = :fk_content) AS e;", {
                fk_site,
                fk_content
            })
            .then(rows => {
                resolve(!!(rows[0].e));
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

/**
 * все комментарии новости, без лимита
 * сортировка по дате создания, последние вверх
 *
 * @param {int} fk_content  - ид контента
 */
model.commentsByContent = async (fk_content) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `pk_comment`, `name_author_comment`, `text_comment`, `create_date` FROM `" + TABLE_NAME + "`" +
                " WHERE `fk_content` = :fk_content AND `is_active` = 1" +
                " ORDER BY `create_date` DESC;", {
                fk_content
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
 * найти кол-во комментов по ид контента
 *
 * @param {array} pk_arr - массив ид контента
 */
model.countCommentsByContentIn = async (pk_arr) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `fk_content`, COUNT(`pk_comment`) AS count_comments " +
                " FROM `" + TABLE_NAME + "` " +
                " WHERE `fk_content` IN (:pk_arr) AND `is_active` = 1 GROUP BY `fk_content`;", {
                pk_arr
            })
            .then(rows => {
                let ret = {};

                console.log(rows);
                for(let i = 0; i < rows.length; i ++) {
                    ret[rows[i].fk_content] = rows[i].count_comments;
                }

                resolve(ret);
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

module.exports = model;
