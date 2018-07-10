"use strict";

let model = function(){};

const
    sphinx = require('../../db/mysql_sphinx_local'),
    mysql = require('../../db/mysql'),
    TABLE_NAME = 'content',
    TABLE_NAME_VIEWS = 'content_views',
    TABLE_NAME_RUBRIC = require('../mysql/content_material_rubric').getTableName(),
    errorlog = require('../../functions').error,
    contentCommentsModel = require('../mysql/content_comments');

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

            // получение основной информации
            let content = await new Promise((resolve, reject) => {
                mysql
                    .getSqlQuery("SELECT `pk_content`, `slug_content`, `title_content`, `publish_date`, " +
                        "`headimgsrc_content`, `intro_content`, `fk_user_created`, `fk_material_type`, `text_content`," +
                        "`name_material_rubric`, count(ip) AS views FROM `" + TABLE_NAME + "` " +
                        " LEFT JOIN `" + TABLE_NAME_VIEWS + "` ON `pk_content` = `fk_content`" +
                        " LEFT JOIN `" + TABLE_NAME_RUBRIC + "` ON `fk_material_rubric` = `pk_material_rubric`" +
                        " WHERE `pk_content` IN (:pk_content_arr) GROUP BY `pk_content`;", {
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
            // end получение основной информации

            // кол-во комментариев
            let count_comments = await contentCommentsModel.countCommentsByContentIn(pk_content_arr);

            for (let i = 0; i < content.length; i++) {
                content[i].count_comments = count_comments[content[i].pk_content] || 0;
            }
            // end кол-во комментариев

            // кол-во найденного контента(пагинация)
            let count = await new Promise((resolve, reject) => {
                sphinx
                    .getSqlQuery('SELECT COUNT(*) AS count FROM politsibru WHERE MATCH(:search);', {
                        search,
                        limit,
                        offset
                    })
                    .then(rows => {
                        resolve(rows[0].count);
                    })
                    .catch(err => {
                        errorlog(err);
                        reject(err);
                    });
            });

            //console.log(count, content);

            return {
                data: content,
                count
            };
        } else {
            return {};
        }
    } catch (err) {
        return {};
    }
};

module.exports = model;