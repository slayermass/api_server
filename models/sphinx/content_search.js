"use strict";

let model = function(){};

const
    sphinx = require('../../db/mysql_sphinx_local'),
    mysql = require('../../db/mysql'),
    TABLE_NAME = 'content',
    errorlog = require('../../functions').error;

sphinx.formatBind();
mysql.formatBind();

/**
 * поиск sphinx новостей
 *
 * @param {String} search - поисковый запрос
 * @param {int} limit     - ограничение выборки
 * @param {int} offset    - смещение выборки
 */
model.searchPolitsibru = async (search, limit, offset) => {
    try {
        let ids = await new Promise((resolve, reject) => {
            sphinx
                .getSqlQuery('SELECT `id` FROM politsibru WHERE MATCH(:search) ORDER BY publish_date DESC LIMIT :offset,:limit;', {
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
        });

        if(ids.length) {
            let pk_content_arr = [];

            for(let i = 0; i < ids.length; i++) {
                pk_content_arr.push(ids[i].id);
            }

            console.log(ids.length, pk_content_arr);

            let content = await new Promise((resolve, reject) => {
                mysql
                    .getSqlQuery("SELECT `pk_content`, `title_content` FROM `" + TABLE_NAME + "` " +
                        " WHERE `pk_content` IN (:pk_content_arr);", {
                        pk_content_arr
                    })
                    .then(rows => {
                        resolve(rows);
                    })
                    .catch(err => {
                        errorlog(err);
                        reject(err);
                    });
            });

            console.log(content);

            return content;
        } else {
            return ids;
        }
    } catch (err) {

    }
};

module.exports = model;