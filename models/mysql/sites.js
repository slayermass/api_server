"use strict";

let sites = function(){};

const
    TABLE_NAME = 'sites',
    mysql = require('../../db/mysql'),
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    errorlog = require('../../functions').error,
    async = require('async'),
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL;

mysql.formatBind();

/**
 * получение всех ресурсов
 */
sites.getAll = () => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "`", {})
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                errorlog(err);
                reject();
            });
    });
};

module.exports = sites;
