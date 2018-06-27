"use strict";

let model = function () {};

const
    TABLE_NAME = 'main_page',
    TABLE_NAME_CONTENT = require('./content').getTableName(),
    TABLE_NAME_CONTENT_COMMENTS = require('./content_comments').getTableName(),
    TABLE_NAME_CONTENT_MATERIAL_RUBRIC = require('./content_material_rubric').getTableName(),
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
 * сохранение(создание) данных главной страницы
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
 * сохранение(обновление) данных главной страницы
 *
 * @param {int} fk_site - ид ресурса
 * @param {int} id_index_page - ид главной страницы (без даты)
 * @param {String} data - json строка ид новостей по порядку
 */
model.update = (fk_site, id_index_page, data) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("UPDATE `" + TABLE_NAME + "` SET `data` = :data WHERE `id_index_page` = :id_index_page;", {
                fk_site,
                id_index_page,
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
 * @param {int} id_index_page - ид главной страницы (без даты)
 * @returns {Array}     - краткие данные контента в строгом порядке сохранения
 */
model.getMainpageInfoByDateOrId = async (fk_site, id_index_page) => {
    try {
        let mainpage_data = await new Promise((resolve, reject) => {
            mysql
                .getSqlQuery("SELECT `data` FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `id_index_page` = :id_index_page;", {
                    fk_site,
                    id_index_page
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

/**
 * получение общей инфы о дате/данных страниц
 *
 * @param {int} fk_site - ид ресурса
 */
model.getMainpageInfo = async (fk_site) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `id_index_page`, `date` FROM `" + TABLE_NAME + "` " +
                " WHERE `fk_site` = :fk_site ORDER BY `date` DESC;", {
                fk_site
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

/** -------- PUBLIC ---------- */

/**
 * получение инфы о главной странице по дате
 * + кол-во активных комментов = сумма всех is_active
 *
 * @param {object} query -
 *      @param {int} fk_site                - ид ресурса
 *      @param {array} select               - массив полей для выборки
 *      @param {int} current_id_index_page  - текущий ид главной страницы
 * @returns {Array}     - краткие данные контента в строгом порядке сохранения
 */
model.getMainpagePublic = async (query) => {
    // собрать в обернутую строку
    const add_select = query.select.map(el => `\`${el}\``).join(',');

    const add_sql = (query.current_id_index_page) ? ' AND `id_index_page` < :current_id_index_page ' : '';

    try {
        let mainpage_data = await new Promise((resolve, reject) => {
            mysql
                .getSqlQuery("SELECT `id_index_page`, `data` FROM `" + TABLE_NAME + "` " +
                    " WHERE `fk_site` = :fk_site " + add_sql + " ORDER BY `date` DESC;", {
                    fk_site: query.fk_site,
                    current_id_index_page: query.current_id_index_page
                }).then(rows => {
                    resolve(rows[0]);
                })
                .catch(err => {
                    errorlog(err);
                    reject(err);
                });
        });

        // если не найден - сразу нет
        if(!(mainpage_data && mainpage_data.data && mainpage_data.data.length)) {
            return {
                success : false
            };
        }

        const ids_content = JSON.parse(mainpage_data.data);

        let content_data = await new Promise((resolve, reject) => {
            mysql
                .getSqlQuery("SELECT " + add_select + ", IFNULL(SUM(`is_active`), 0) AS count_comments " +
                    " FROM `" + TABLE_NAME_CONTENT + "` " +
                    " LEFT JOIN `" + TABLE_NAME_CONTENT_MATERIAL_RUBRIC + "` ON `fk_material_rubric` = `pk_material_rubric` " +
                    " LEFT JOIN `" + TABLE_NAME_CONTENT_COMMENTS + "` ON `fk_content` = `pk_content` " +
                    " WHERE `pk_content` IN (:ids_content) GROUP BY `pk_content`;", {
                    fk_site: query.fk_site,
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
            arr[content_data[i].pk_content] = content_data[i];
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
            id_index_page : mainpage_data.id_index_page,
            data    : end_data
        };
    } catch (err) {
        errorlog(err);
    }
};

module.exports = model;
