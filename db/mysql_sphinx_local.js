"use strict";

let mysql = require('mysql'),
    mysql_config = require('../config/mysql_config'),
    errorlog = require('../functions').error;

let connection;
/**
 * sql запрос в базу
 *
 * изменение - открытие и закрытие соединения. теряет связь при постоянном коннекте, без понятия как сделать верно
 * @param {String} sql - sql запрос
 * @param {Object} data - параметр для биндинга к sql
 * @returns {Promise}
 */
exports.getSqlQuery = async (sql, data = {}) => {
    connection = mysql.createConnection(mysql_config.spinxConfigLocal);

    connection.config.queryFormat = function (query, values) {
        if (!values) return query;
        return query.replace(/\:(\w+)/g, function (txt, key) {
            if (values.hasOwnProperty(key)) {
                return this.escape(values[key]);
            }
            return txt;
        }.bind(this));
    };

    let ret = await new Promise(function (resolve, reject) {
        connection.query(sql, data, function (err, rows) {
            if (err) {
                errorlog(err);
                reject(err);
            } else {
                if (rows.length === 0) {
                    resolve({});
                } else {
                    resolve(rows);
                }
            }
        });
    });

    connection.destroy();

    return ret;
};