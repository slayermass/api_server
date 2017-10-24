"use strict";

let model = function(){};

const
    TABLE_NAME = 'r_content_to_tags',
    mysql = require('../../db/mysql'),
    errorlog = require('../../functions').error,
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL;

mysql.formatBind();

/**
 * сохранение связей контент-теги
 *
 * @param {int} fk_content - ид контента
 * @param {Array} fk_tags - ид тегов
 */
model.save = (fk_content, fk_tags) => {
    let idata = [];

    for(let i = 0; i < fk_tags.length; i ++) {
        idata.push([fk_content, fk_tags[i]]);
    }

    mysql.formatInit();
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`fk_content`, `fk_tag`) VALUES ?", [idata])
            .then(data => {
                resolve(data);
                mysql.formatBind();
            })
            .catch(err => {
                errorlog(err);
                reject(err);
                mysql.formatBind();
            });
    });
};

module.exports = model;
