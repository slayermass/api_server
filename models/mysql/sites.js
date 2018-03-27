"use strict";

let sites = function(){};

const
    TABLE_NAME = 'sites',
    mysql = require('../../db/mysql');

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
                reject();
            });
    });
};

module.exports = sites;
