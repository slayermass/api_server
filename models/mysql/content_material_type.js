"use strict";

let model = function () {
};

const
    TABLE_NAME = 'content_material_type',
    mysql = require('../../db/mysql');

mysql.formatBind();

/**
 * получение всех типов материалов
 */
model.getAll = () => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "`", {})
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                reject(err);
            });
    });
};

module.exports = model;
