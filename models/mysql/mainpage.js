"use strict";

let model = function () {};

const
    TABLE_NAME = 'main_page',
    mysql = require('../../db/mysql'),
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    errorlog = require('../../functions').error,
    async = require('async'),
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL,
    addWhere = require('../../functions').addWhere;

mysql.formatBind();

/**
 * get a table name of a model
 * @returns {string}
 */
model.getTableName = () => {
    return TABLE_NAME;
};

/**
 * сохранение данных главной страницы
 */
model.save = (fk_site, date, data) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("INSERT INTO  `" + TABLE_NAME + "` (`data`, `date`, `fk_site`) VALUES (:data, :date, :fk_site);", {
                fk_site,
                date,
                data
            })
            .then(() => {
                resolve();
            })
            .catch(err => {
                reject(err);
            });
    });
};

module.exports = model;
