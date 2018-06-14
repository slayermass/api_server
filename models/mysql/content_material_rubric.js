"use strict";

let model = function () {
};

const TABLE_NAME = 'content_material_rubric';
const mysql = require('../../db/mysql');

mysql.formatBind();

/**
 * получение всех рубрик материалов
 *
 * @param {int} fk_site - ид сайта
 */
model.getAll = (fk_site) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `pk_material_rubric`, `name_material_rubric` FROM `" + TABLE_NAME + "`" +
                " WHERE `fk_site` = :fk_site;", {
                fk_site
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                reject(err);
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
