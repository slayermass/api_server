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

/**
 * редактирова пункт меню
 *
 * @param {int} fk_site - ид сайта
 * @param {Object} menu_item -
 */
model.updateOne = (fk_site, menu_item) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("UPDATE `" + TABLE_NAME + "`" +
                " SET `name_menu_item` = :name_menu_item, `path_menu_item` = :path_menu_item, `isactive` = :isactive" +
                " WHERE `pk_menu_item` = :pk_menu_item AND `fk_site` = :fk_site;", {
                pk_menu_item: menu_item.pk_menu_item,
                name_menu_item: menu_item.name_menu_item,
                path_menu_item: menu_item.path_menu_item,
                isactive: menu_item.isactive,
                fk_site
            })
            .then(() => {
                resolve(true);
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

/**
 * создать пункт меню
 *
 * @param {int} fk_site - ид сайта
 * @param {Object} menu_item -
 */
model.createOne = (fk_site, menu_item) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`name_menu_item`, `path_menu_item`, `isactive`, `fk_site`) " +
                "VALUES (:name_menu_item, :path_menu_item, :isactive, :fk_site);", {
                name_menu_item: menu_item.name_menu_item,
                path_menu_item: menu_item.path_menu_item,
                isactive: menu_item.isactive,
                fk_site
            })
            .then(row => {
                resolve({
                    id: row.insertId,
                    isnew: true
                });
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

/**
 * удалить пункт меню
 *
 * @param {int} fk_site      - ид сайта
 * @param {int} pk_menu_item - ид пункта
 */
model.deleteOne = (fk_site, pk_menu_item) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("DELETE FROM `" + TABLE_NAME + "` WHERE `pk_menu_item` = :pk_menu_item AND `fk_site` = :fk_site;", {
                pk_menu_item,
                fk_site
            })
            .then(() => {
                resolve(true);
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

module.exports = model;
