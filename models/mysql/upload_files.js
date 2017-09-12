"use strict";

let upload_files = function(){};

const
    TABLE_NAME = 'upload_files',
    mysql = require('../../db/mysql'),
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    errorlog = require('../../functions').error,
    mime = require('mime-types'),
    async = require('async'),
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL;

mysql.formatBind();

/**
 * внесение данных при загрузке файла
 *
 * @param {Array} arr_files -
*            original_name_file(оригинальное имя файла)
             name_file(имя файла на диске)
             path(путь к файлу)
 *
 * @returns {Promise}
 */
upload_files.onNewFiles = (arr_files) => {
    let farr = [];

    for (let i = 0; i < arr_files.length; i++) {
        farr.push(
            function(callback) {
                mysql
                    .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`original_name_file`, `name_file`, `path`) VALUES (:original_name_file, :name_file, :path)", {
                        original_name_file: entities.encode(arr_files[i].original_name_file),
                        name_file: arr_files[i].name_file,
                        path: arr_files[i].path
                    })
                    .then(row => {
                        callback(null, {
                            pk_file: row.insertId,
                            original_name_file: entities.encode(arr_files[i].original_name_file),
                            name_file: arr_files[i].name_file,
                            upload_date: new Date().toISOString(), // неточное время конечно
                            ext: mime.extension(mime.contentType(arr_files[i].name_file))
                        });
                    })
                    .catch(err => {
                        errorlog(err);
                        callback(err)
                    })
            },
        );
    }

    //динамический параллельный
    return new Promise((resolve, reject) => {
        async.parallel(farr, (err, results) => {
            if(err) reject();
            resolve(results);
        });
    });
};

/**
 * найти данные о файле по его названию(сохраненному)
 *
 * @param {String} name_file - название файла
 *
 * @returns {Promise}
 */
upload_files.findByNameFile = (name_file) => {
    return new Promise((resolve, reject) => {
        //найти диалоги, в которых состоит пользователь
        mysql
            .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "` WHERE `name_file` = :name_file", {
                name_file: entities.encode(name_file)
            })
            .then(row => {
                resolve(row[0]);
            })
            .catch(err => {
                errorlog(err);
                reject();
            })
    });
};

/**
 * найти пути(и имена в том же порядке) по именам файлов
 *
 * @param {Array} name_files - имена файлов
 *
 * @returns {Promise}
 */
upload_files.findPathByNames = (name_files) => {
    let names = [];

    for(let i = 0; i < name_files.length; i ++) {
        names.push(entities.encode(name_files[i]));
    }

    return new Promise((resolve, reject) => {
        //найти диалоги, в которых состоит пользователь
        mysql
            .getSqlQuery("SELECT `path`, `name_file` FROM `" + TABLE_NAME + "` WHERE `name_file` IN(:names)", {
                names
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                errorlog(err);
                reject();
            })
    });
};

/**
 * удаление файлов
 *
 * @param {Array} name_files - имена файлов
 *
 * @returns {Promise}
 */
upload_files.deleteByNames = (name_files) => {
    let names = [];

    for(let i = 0; i < name_files.length; i ++) {
        names.push(entities.encode(name_files[i]));
    }

    return new Promise((resolve, reject) => {
        //найти диалоги, в которых состоит пользователь
        mysql
            .getSqlQuery("DELETE FROM `" + TABLE_NAME + "` WHERE `name_file` IN(:names)", {
                names
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                errorlog(err);
                reject();
            })
    });
};

/**
 * поиск для api
 *
 * @param {int} limit - Кол-во файлов
 *
 * @returns {Promise}
 */
upload_files.findApi = (limit) => {
    return new Promise((resolve, reject) => {
        //найти диалоги, в которых состоит пользователь
        mysql
            .getSqlQuery("SELECT `pk_file`, `original_name_file`, `name_file`, `upload_date` FROM `" + TABLE_NAME + "` LIMIT :limit", {
                limit
            })
            .then(rows => {
                //добавить расширение файла
                for(let i = 0; i < rows.length; i++) {
                    rows[i].ext = mime.extension(mime.contentType(rows[i].name_file));
                }
                resolve(rows);
            })
            .catch(err => {
                errorlog(err);
                reject();
            })
    });
};

module.exports = upload_files;
