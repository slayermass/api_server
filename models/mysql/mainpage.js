"use strict";

let model = function () {};

const
    TABLE_NAME = 'main_page',
    TABLE_NAME_CONTENT = require('./content').getTableName(),
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
 *
 * @param {int} fk_site - ид ресурса
 * @param {date} date   - дата для главной страницы
 * @param {String} data - json строка ид новостей по порядку
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
                errorlog(err);
                reject(err);
            });
    });
};

/**
 * получение инфы о главной странице по дате
 *
 * @param {int} fk_site - ид ресурса
 * @param {date} date   - дата показа/создания главной страницы
 * @returns {Array}     - краткие данные контента в строгом порядке сохранения
 */
model.getMainpageInfoByDate = async (fk_site, date) => {
    try {
        let mainpage_data = await new Promise((resolve, reject) => {
            mysql
                .getSqlQuery("SELECT `data` FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `date` = :date;", {
                    fk_site,
                    date
                }).then(rows => {
                    resolve(rows[0]);
                })
                .catch(err => {
                    errorlog(err);
                    reject(err);
                });
        });

        const ids_content = JSON.parse(mainpage_data.data);

        let content_data = await new Promise((resolve, reject) => {
            mysql
                .getSqlQuery("SELECT `pk_content`, `title_content`, `headimgsrc_content` " +
                    " FROM `" + TABLE_NAME_CONTENT + "`" +
                    " WHERE `pk_content` IN (:ids_content);", {
                    fk_site,
                    ids_content
                }).then(rows => {
                    resolve(rows);
                })
                .catch(err => {
                    errorlog(err);
                    reject(err);
                });
        });

        // привести к удобному виду
        let arr = {};

        for(let i = 0; i < content_data.length; i++) {
            arr[content_data[i].pk_content] = {
                pk_content          : content_data[i].pk_content,
                title_content       : content_data[i].title_content,
                headimgsrc_content  : content_data[i].headimgsrc_content
            };
        }
        // end привести к удобному виду

        // привести к порядку из выборки
        let end_data = [];

        for(let i = 0; i < ids_content.length; i++) {
            end_data.push(arr[ids_content[i]]);
        }
        // end привести к порядку из выборки

        return {
            success : true,
            data    : end_data
        };
    } catch (err) {
        errorlog(err);
    }
};

module.exports = model;
