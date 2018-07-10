"use strict";

let model = function(){};

const
    mysql = require('../../db/mysql_sphinx_local');

mysql.formatBind();

/**
 * поиск sphinx новостей
 *
 * @param {int} fk_site - ид сайта - required
 * @param {int} limit   - ограничение выборки
 */
model.searchPolitsibru = async (search, limit, offset) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `id` FROM politsibru WHERE MATCH(:search) ORDER BY publish_date DESC LIMIT :offset,:limit", {
                search,
                limit,
                offset
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