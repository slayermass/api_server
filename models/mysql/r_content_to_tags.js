"use strict";

let model = function(){};

const
    TABLE_NAME = 'r_content_to_tags',
    mysql = require('../../db/mysql');

mysql.formatBind();

/**
 * удаление старых и сохранение связей контент-теги
 * удалять и перезаписывать можно спокойно
 *
 * @param {int} fk_content - ид контента
 * @param {Array} fk_tags - ид тегов
 */
model.save = (fk_content, fk_tags) => {
    let idata = [];

    for(let i = 0; i < fk_tags.length; i ++) {
        idata.push([fk_content, fk_tags[i]]);
    }

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("DELETE FROM `" + TABLE_NAME + "` WHERE `fk_content` = :fk_content;", {
                fk_content
            })
            .then(() => {
                mysql.formatInit();

                mysql
                    .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`fk_content`, `fk_tag`) VALUES ?", [idata])
                    .then(data => {
                        resolve(data);
                        mysql.formatBind();
                    })
                    .catch(err => {
                        reject(err);
                        mysql.formatBind();
                    });
            })
            .catch(err => {
                reject(err);
                mysql.formatBind();
            });
    });
};

/**
 * get a table name of model
 * @returns {string}
 */
model.getTableName = () => {
    return TABLE_NAME;
};

module.exports = model;
