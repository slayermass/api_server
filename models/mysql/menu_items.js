"use strict";

let model = function () {
};

const
    TABLE_NAME = 'menu_items',
    mysql = require('../../db/mysql'),
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    errorlog = require('../../functions').error,
    async = require('async'),
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL,
    empty = require('is-empty');

mysql.formatBind();

/**
 * найти все пункты меню (и структуру)
 *
 * @param {int} fk_site - ид сайта
 */
model.findAll = (fk_site) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `pk_menu_item`, `name_menu_item`, `path_menu_item`, `isactive`" +
                " FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site", {
                fk_site
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                if (err === EMPTY_SQL) {
                    resolve({});
                } else {
                    errorlog(err);
                    reject(err);
                }
            });
    });
};

module.exports = model;
