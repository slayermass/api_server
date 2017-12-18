"use strict";

let model = function () {
};

const
    TABLE_NAME = 'text_blocks',
    mysql = require('../../db/mysql'),
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    errorlog = require('../../functions').error,
    async = require('async'),
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL,
    empty = require('is-empty'),
    addWhere = require('../../functions').addWhere;

mysql.formatBind();

/**
 * get a table name of model
 * @returns {string}
 */
model.getTableName = () => {
    return TABLE_NAME;
};

/**
 * create html text block
 *
 * @param {Object} text_block - data of text block
 *      @param {text} text    - text block
 *      @param {String} label - label block (uniq)
 * @param {int} fk_site       - id site
 */
model.create = (text_block, fk_site) => {
    let label = entities.encode(text_block.label);

    return new Promise((resolve, reject) => {
        model
            .checkUniqLabel(label, fk_site)
            .then(() => {
                mysql
                    .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`text`, `label_text_block`, `isactive`, `fk_site`, `fk_user_created`)" +
                        " VALUES (:text, :label, :isactive, :fk_site, :fk_user_created);", {
                        text: entities.encode(text_block.text),
                        label,
                        isactive: text_block.isactive,
                        fk_site,
                        fk_user_created: text_block.fk_user_created
                    })
                    .then(row => {
                        resolve({
                            success: true,
                            pk_text_block: row.insertId
                        });
                    })
                    .catch(err => {
                        errorlog(err);
                        reject(err);
                    });
            })
            .catch(() => {
                resolve({
                    success: false,
                    errors: ['required unique label']
                });
            });
    });
};

/**
 * check label for unique
 *
 * @param {String} label        - label
 * @param {int} fk_site         - id site
 */
model.checkUniqLabel = (label, fk_site) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `label_text_block` FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `label_text_block` = :label", {
                label,
                fk_site
            })
            .then(() => {
                reject();
            })
            .catch(() => { // все нормально - не найдено похожих
                resolve();
            });
    });
};

/**
 * getting content by id/label of text block
 *
 * @param {int} fk_site     - id site
 * @param {int} pk_block    - id text block
 * @param {String} label    - label block
 *
 * @returns {Promise}
 */
model.find = (fk_site, pk_block, label) => {
    let condition = '';

    return new Promise((resolve, reject) => {
        if (!empty(label)) { // search by label
            condition = '`label_text_block` = :label_text_block';
        } else if (!isNaN(fk_site) && fk_site >= 1) { // search by pk
            condition = '`pk_text_block` = :pk_text_block';
        } else {
            reject();
        }

        mysql
            .getSqlQuery("SELECT `pk_text_block`, `text`" +
                " FROM `" + TABLE_NAME + "`" +
                " WHERE `fk_site` = :fk_site AND " + condition, {
                fk_site,
                pk_text_block: pk_block,
                label_text_block: label
            })
            .then(rows => {
                resolve(rows[0]);
            })
            .catch(() => {
                reject();
            });
    });
};

/**
 * getting all content
 *
 * @param {int} fk_site         - id site
 * @param {Object} params       - параметры
 *      @param {int} limit      - кол-во записей для поиска
 *      @param {int} offset     - отступ для поиска
 *      @param {int} orderby    - сортировка
 *      @param {int} isactive   - выводить удаленные(0 - нет, 1 - да, -1 - все)
 * @param {Object} search       - пользовательский поиск по параметрам {val: значение, type: тип поля}
 *
 * @returns {Promise}
 */
model.findAll = (fk_site, params, search) => {
    let add_where = addWhere(search);

    return new Promise((resolve, reject) => {
        async.parallel({
            data: (callback) => { //основная инфа
                mysql
                    .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "`" +
                        " WHERE `fk_site` = :fk_site" + add_where +
                        " ORDER BY " + params.orderby + " LIMIT :limit OFFSET :offset", {
                        fk_site,
                        limit: params.limit,
                        offset: params.offset,
                    })
                    .then(rows => {
                        callback(null, rows);
                    })
                    .catch(err => {
                        if (err === EMPTY_SQL) {
                            callback(null, {});
                        } else {
                            callback(err);
                        }
                    });
            },
            count: (callback) => { //кол-во записей
                mysql
                    .getSqlQuery("SELECT COUNT(*) AS count, " +
                        "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site) AS count, " +
                        "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `isactive` = 1) AS active, " +
                        "(SELECT COUNT(*) FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `isactive` = 0) AS inactive " +
                        "FROM `" + TABLE_NAME + "`", {
                        fk_site
                    })
                    .then(row => {
                        callback(null, {
                            count: row[0].count,
                            active: row[0].active,
                            inactive: row[0].inactive
                        });
                    })
                    .catch(err => {
                        callback(err);
                    });
            }
        }, (err, results) => {
            if (err) {
                errorlog(err);
                return reject(err);
            }

            resolve({
                data: results.data,
                count: results.count
            });
        });
    });
};

module.exports = model;
