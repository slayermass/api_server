"use strict";

let mysql      = require('mysql'),
    mysql_config = require('../config/mysql_config'),
    connection = mysql.createConnection(mysql_config.config),
    EMPTY_SQL = require('../config/mysql_config').EMPTY_SQL;

/**
 * sql запрос в базу
 * @param {String} sql - sql запрос
 * @param {Object} data - параметр для биндинга к sql
 * @returns {Promise}
 */
exports.getSqlQuery = (sql, data) => {
    return new Promise(function(resolve, reject) {
        connection.query(sql, data, function(err, rows) {
            if(err){
                reject(err);
            } else {
                if(rows.length === 0){//пустой ответ
                    reject(EMPTY_SQL);
                } else {
                    resolve(rows);
                }
            }
        });
    });
};

/**
 * начальный формат sql запросов 'INSERT VALUES ?', {param: 1, taram: '2'}
 */
exports.formatInit = function() {
    connection.config.queryFormat = undefined;
};

/**
 * формат биндинга sql запросов 'INSERT VALUES (:param, :taram)', {param: 1, taram: '2'}
 */
exports.formatBind = function() {
    connection.config.queryFormat = function (query, values) {
        if (!values) return query;
        return query.replace(/\:(\w+)/g, function (txt, key) {
            if (values.hasOwnProperty(key)) {
                return this.escape(values[key]);
            }
            return txt;
        }.bind(this));
    };
};
