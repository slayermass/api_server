"use strict";

let model = function () {
};

const
    TABLE_NAME = 'menu',
    mysql = require('../../db/mysql'),
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    errorlog = require('../../functions').error,
    async = require('async'),
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL,
    empty = require('is-empty'),
    addWhere = require('../../functions').addWhere;

mysql.formatBind();

/**
 * get a table name of model
 * @returns {string}
 */
model.getTableName = () => {
    return TABLE_NAME;
};

/**
 * найти все пункты меню
 *
 * @param {int} fk_site    - ид сайта
 * @param {int} limit      - кол-во записей для поиска
 * @param {int} offset     - отступ для поиска
 */
model.findAll = (fk_site, limit, offset, search) => {
    let add_where = addWhere(search);

    return new Promise((resolve, reject) => {
        async.parallel({
            data: (callback) => { //основная инфа
                mysql
                    .getSqlQuery("SELECT `pk_menu`, `name_menu`, `label_menu` FROM `" + TABLE_NAME + "`" +
                        " WHERE `fk_site` = :fk_site " + add_where + " LIMIT :limit OFFSET :offset", {
                        fk_site,
                        limit,
                        offset
                    })
                    .then(rows => {
                        callback(null, rows);
                    })
                    .catch(err => {
                        if (err === EMPTY_SQL) {
                            callback(null, {});
                        } else {
                            callback(err);
                        }
                    });
            },
            count: (callback) => { //кол-во записей
                mysql
                    .getSqlQuery("SELECT COUNT(*) AS count FROM `" + TABLE_NAME + "`" +
                        " WHERE `fk_site` = :fk_site", {
                        fk_site
                    })
                    .then(rows => {
                        callback(null, rows);
                    })
                    .catch(err => {
                        if (err === EMPTY_SQL) {
                            callback(null, {});
                        } else {
                            callback(err);
                        }
                    });
            }
        }, (err, results) => {
            if (err) {
                errorlog(err);
                return reject(err);
            }

            resolve({
                data: results.data,
                count: results.count
            });
        });
    });
};

/**
 * find menu data
 *
 * @param {int} fk_site - id site
 * @param {int} pk_menu - pk parent menu
 */
model.findOne = (fk_site, pk_menu) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `name_menu`, `label_menu` FROM `" + TABLE_NAME + "`" +
                " WHERE `fk_site` = :fk_site AND `pk_menu` = :pk_menu", {
                fk_site,
                pk_menu
            })
            .then(rows => {
                resolve(rows[0]);
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
 * update menu by id
 *
 * @param {int} fk_site - id site
 * @param {Object} menu - object of data menu
 */
model.updateOne = (fk_site, menu) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("UPDATE `" + TABLE_NAME + "` SET `name_menu` = :name_menu, `label_menu` = :label_menu" +
                " WHERE `fk_site` = :fk_site AND `pk_menu` = :pk_menu", {
                fk_site,
                name_menu: entities.encode(menu.name_menu),
                label_menu: entities.encode(menu.label_menu),
                pk_menu: menu.pk_menu
            })
            .then(() => {
                resolve();
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

/**
 * create menu
 *
 * @param {int} fk_site - id site
 * @param {Object} menu - object of data menu
 */
model.createOne = (fk_site, menu) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`name_menu`, `fk_site`, `label_menu`) VALUES (:name_menu, :fk_site, :label_menu);", {
                name_menu: entities.encode(menu.name_menu),
                label_menu: entities.encode(menu.label_menu),
                fk_site
            })
            .then(() => {
                resolve();
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

/**
 * fully deletion menu
 * each submenu will be deleted cascade
 *
 * @param {int} fk_site - id site
 * @param {int} pk_menu - pk menu
 */
model.deleteOne = (fk_site, pk_menu) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("DELETE FROM `" + TABLE_NAME + "` WHERE `pk_menu` = :pk_menu AND `fk_site` = :fk_site;", {
                pk_menu,
                fk_site
            })
            .then(() => {
                resolve();
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

module.exports = model;
