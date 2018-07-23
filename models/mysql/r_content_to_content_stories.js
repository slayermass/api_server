"use strict";

let model = function(){};

const
    TABLE_NAME = 'r_content_to_content_stories',
    mysql = require('../../db/mysql');

mysql.formatBind();

/**
 * удаление старых и сохранение связей контент-сюжеты
 */
model.save = async (fk_site, fk_content, ids_content_stories) => {
    let idata = [];

    for(let i = 0; i < ids_content_stories.length; i ++) {
        idata.push([fk_content, Number(ids_content_stories[i])]);
    }

    const deleted = await new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("DELETE FROM `" + TABLE_NAME + "` WHERE `fk_content` = :fk_content;", {
                fk_content
            })
            .then(() => {
                resolve(true);
            })
            .catch(err => {
                reject(err);
                mysql.formatBind();
            });
    });

    mysql.formatInit();

    if(deleted && idata.length) {
        const inserted = await new Promise((resolve, reject) => {
            mysql
                .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`fk_content`, `fk_content_stories`) VALUES ?", [idata])
                .then(data => {
                    resolve(data);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    mysql.formatBind();

    return true;
};

/**
 * get a table name of model
 * @returns {string}
 */
model.getTableName = () => {
    return TABLE_NAME;
};

module.exports = model;
