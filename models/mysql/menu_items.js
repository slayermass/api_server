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
    empty = require('is-empty'),
    MENU_TABLE_NAME = require('./menu').getTableName();

const cacheModel = require('../../functions/cache');

const redis = require("redis");
const client = redis.createClient();
client.on("error", function (err) {
    console.log("Error " + err);
});

mysql.formatBind();

/**
 * find menu items with their sorting
 *
 * @param {int} fk_site         - id site
 * @param {int} pk_menu         - pk parent menu
 * @param {String} label_menu   - label parent menu(should be unique)
 */
model.findAll = async (fk_site, pk_menu, label_menu) => {
    label_menu = entities.encode(label_menu);

    let cachedata = await cacheModel.hget(`label_menu_${label_menu}_${fk_site}`, `main_${fk_site}`);

    if(cachedata) {
        return cachedata;
    }

    let condition = '';

    if (!empty(label_menu)) { // search by label
        condition = '`label_menu` = :label_menu';
    } else if (!isNaN(fk_site) && fk_site >= 1) { // search by pk
        condition = '`pk_menu` = :pk_menu';
    } else {
        return;
    }

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `name_menu_item`, `path_menu_item`, `pk_menu_item`" +
                " FROM `" + TABLE_NAME + "`" +
                " LEFT JOIN `" + MENU_TABLE_NAME + "` ON " + MENU_TABLE_NAME + ".pk_menu = " + TABLE_NAME + ".fk_menu" +
                " WHERE `fk_site` = :fk_site AND `isactive` = 1 AND " + condition +
                " ORDER BY `sort`", {
                fk_site,
                pk_menu,
                label_menu
            })
            .then(rows => {
                if(empty(rows)) {
                    resolve({});
                } else {
                    rows = {
                        label_menu,
                        menu_items: rows
                    };

                    console.log(rows);

                    resolve(rows);
                }

                cacheModel.hset(`label_menu_${label_menu}_${fk_site}`, `main_${fk_site}`, rows);
            })
            .catch(err => {
                if (err === EMPTY_SQL) {
                    resolve({});
                } else {
                    reject(err);
                }
            });
    });
};

/**
 * update menu item
 *
 * @param {Object} menu_item - an object with attributes of menu item
 * @param {int} pk_menu      - pk parent menu
 */
model.updateOne = (menu_item, pk_menu) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("UPDATE `" + TABLE_NAME + "`" +
                " SET `name_menu_item` = :name_menu_item, `path_menu_item` = :path_menu_item, `isactive` = :isactive" +
                " WHERE `pk_menu_item` = :pk_menu_item AND `fk_menu` = :fk_menu", {
                pk_menu_item: menu_item.pk_menu_item,
                name_menu_item: menu_item.name_menu_item,
                path_menu_item: menu_item.path_menu_item,
                isactive: menu_item.isactive,
                fk_menu: pk_menu
            })
            .then(() => {
                resolve(true);
            })
            .catch(err => {
                reject(err);
            });
    });
};

/**
 * create menu item
 *
 * @param {Object} menu_item - an object with attributes of menu item
 * @param {int} pk_menu      - pk parent menu
 */
model.createOne = (menu_item, pk_menu) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`name_menu_item`, `path_menu_item`, `isactive`, `fk_menu`) " +
                "VALUES (:name_menu_item, :path_menu_item, :isactive, :fk_menu);", {
                name_menu_item: menu_item.name_menu_item,
                path_menu_item: menu_item.path_menu_item,
                isactive: menu_item.isactive,
                fk_menu: pk_menu
            })
            .then(row => {
                resolve({
                    id: row.insertId,
                    isnew: true
                });
            })
            .catch(err => {
                reject(err);
            });
    });
};

/**
 * delete menu item
 *
 * @param {int} fk_site      - id site
 * @param {int} pk_menu      - pk parent menu
 * @param {int} pk_menu_item - pk menu item
 */
model.deleteOne = (fk_site, pk_menu, pk_menu_item) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("DELETE FROM `" + TABLE_NAME + "` WHERE `pk_menu_item` = :pk_menu_item AND `fk_menu` = :fk_menu;", {
                pk_menu_item,
                fk_menu: pk_menu
            })
            .then(() => {
                resolve(true);
            })
            .catch(err => {
                reject(err);
            });
    });
};

/**
 * create/update sort of items menu
 * stores in the menu table
 * should be checking for changes
 *
 * @param {int} fk_site         - id site
 * @param {int} pk_menu         - pk menu
 * @param {Array} saveSort      - array of objects { id: ид пункта, sort: число сортировки }
 */
model.saveSort = (fk_site, pk_menu, saveSort) => {
    let farr = [];

    //prepare executable string
    for (let i = 0; i < saveSort.length; i++) {
        farr.push(
            function (callback) {
                mysql
                    .getSqlQuery("UPDATE `" + TABLE_NAME + "` SET `sort` = :sort WHERE `pk_menu_item` = :pk_menu_item AND `fk_menu` = :fk_menu", {
                        sort: parseInt(saveSort[i].sort, 10),
                        pk_menu_item: parseInt(saveSort[i].id, 10),
                        fk_menu: pk_menu
                    })
                    .then(() => {
                        callback(null);
                    })
                    .catch(err => {
                        errorlog(err);
                        callback(err);
                    });
            }
        );
    }

    //динамический параллельный
    return new Promise((resolve, reject) => {
        async.parallel(farr, (err, results) => {
            if (err) reject();
            resolve(results);
        });
    });
};

module.exports = model;
