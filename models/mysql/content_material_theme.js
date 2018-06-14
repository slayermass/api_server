"use strict";

let model = function () {
};

const TABLE_NAME = 'content_material_theme';
const mysql = require('../../db/mysql');

mysql.formatBind();

/**
 * получение всех тем материалов
 *
 * @param {int} fk_site - ид сайта
 */
model.getAll = (fk_site) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `pk_material_theme`, `name_material_theme` FROM `" + TABLE_NAME + "`" +
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

module.exports = model;
