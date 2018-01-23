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
    fs = require('fs'),
    EMPTY_SQL = require('../../config/mysql_config').EMPTY_SQL;

mysql.formatBind();

/**
 * внесение данных при загрузке файла
 *
 * @param {int} fk_site - ид ресурса
 * @param {Array} arr_files -
 *           original_name_file(оригинальное имя файла)
             name_file(имя файла на диске)
             path(путь к файлу)
 *
 * @returns {Promise}
 */
upload_files.onNewFiles = (fk_site, arr_files) => {
    let farr = [];

    for (let i = 0; i < arr_files.length; i++) {
        farr.push(
            function(callback) {
                mysql
                    .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`fk_site`, `original_name_file`, `name_file`, `path`)" +
                        " VALUES (:fk_site, :original_name_file, :name_file, :path)", {
                        fk_site,
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
 * добавление файла в библиотеку по ссылке
 *
 * @param {int} fk_site        - ид ресурса
 * @param {String} path        - ссылка на файл
 * @param {String} original_name_file   - название(опционально)
 */
upload_files.newByLink = (fk_site, path, original_name_file) => {
    if (original_name_file.length < 1) {
        original_name_file = 'noname';
    }

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`fk_site`, `original_name_file`, `path`, `link`) " +
                "VALUES (:fk_site, :original_name_file, :path, :link)", {
                fk_site,
                path: null,
                original_name_file: entities.encode(original_name_file),
                link: entities.encode(path),
                upload_date: new Date().toISOString()
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
 * найти данные о файле по его названию(сохраненному)
 *
 * @param {String} name_file - название файла
 *
 * @returns {Promise}
 */
upload_files.findByNameFile = (name_file) => {
    return new Promise((resolve, reject) => {
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
 * найти пути(и имена в том же порядке) по ид файлов
 *
 * @param {int} fk_site - ид ресурса
 * @param {Array} pk_files - ид файлов
 *
 * @returns {Promise}
 */
upload_files.findPathByIds = (fk_site, pk_files) => {
    let names = [];

    for(let i = 0; i < pk_files.length; i ++) {
        names.push(parseInt(pk_files[i], 10));
    }

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `path`, `name_file` FROM `" + TABLE_NAME + "` WHERE `pk_file` IN(:pk_files) AND `fk_site` = :fk_site", {
                fk_site,
                pk_files: names
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                errorlog(err);
                reject();
            });
    });
};

/**
 * найти пути(и имена в том же порядке) по именам файлов
 *
 * @param {int} fk_site - ид ресурса
 * @param {Array} name_files - имена файлов
 *
 * @returns {Promise}
 */
upload_files.findPathByNames = (fk_site, name_files) => {
    let names = [];

    for(let i = 0; i < name_files.length; i ++) {
        names.push(entities.encode(name_files[i]));
    }

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `path`, `name_file` FROM `" + TABLE_NAME + "` WHERE `name_file` IN(:names) AND `fk_site` = :fk_site", {
                fk_site,
                names
            })
            .then(rows => {
                resolve(rows);
            })
            .catch(err => {
                errorlog(err);
                reject();
            });
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
 * удаление файлов
 *
 * @param {Array} pk_files - ид файлов
 *
 * @returns {Promise}
 */
upload_files.deleteByIds = (pk_files) => {
    let names = [];

    for(let i = 0; i < pk_files.length; i ++) {
        names.push(entities.encode(pk_files[i]));
    }

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("DELETE FROM `" + TABLE_NAME + "` WHERE `pk_file` IN(:pk_files)", {
                pk_files: names
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
 * поиск файлов, информации о них для api
 *
 * @param {int} fk_site     - ид ресурса
 * @param {int} limit       - Кол-во файлов (0 при ids)
 * @param {Array} pk_files  - поиск по ид файлов(игнорируя лимит)
 *
 * @returns {Promise}
 */
upload_files.findApi = (fk_site, limit, pk_files) => {
    let add_where = '',
        add_limit = '';

    // проверка на указанность параметров
    if (limit === 0 && pk_files.length >= 1) {
        add_where = "AND `pk_file` IN (:pk_files) ";
    } else {
        add_limit = "LIMIT :limit";
    }

    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `pk_file`, `original_name_file`, `name_file`, `upload_date`, `link` " +
                "FROM `" + TABLE_NAME + "` " +
                "WHERE `fk_site` = :fk_site " +
                add_where +
                "ORDER BY `upload_date` DESC " + add_limit, {
                fk_site,
                limit,
                pk_files
            })
            .then(rows => {
                //добавить расширение файла
                for(let i = 0; i < rows.length; i++) {
                    rows[i].ext = mime.extension(mime.contentType(rows[i].name_file));
                }
                resolve(rows);
            })
            .catch(err => {
                if(err === EMPTY_SQL) {
                    resolve([]);
                } else {
                    errorlog(err);
                    reject();
                }
            })
    });
};

/**
 * получить инфо по файлу
 *
 * @param {int} fk_site - ид ресурса
 * @param {int} pk_file - ид файла
 *
 * @returns {Promise}
 */
upload_files.getInfoFile = (fk_site, pk_file) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `pk_file` = :pk_file", {
                fk_site,
                pk_file
            })
            .then(rows => {
                let row = rows[0],
                    return_arr = [];

                if (row.path === null) {
                    return_arr.push({
                        size: 0, //bytes
                        original_name_file: row.original_name_file,
                        name_file: row.name_file,
                        upload_date: row.upload_date,
                        ext: ''
                    });

                    resolve(return_arr);
                } else {
                    const filePath = row.path + '/' + row.name_file;

                    //проверить наличие файла
                    fs.exists(filePath, (exists) => {
                        if (exists) {
                            let stat = fs.statSync(filePath);

                            return_arr.push({
                                size: stat.size, //bytes
                                original_name_file: row.original_name_file,
                                name_file: row.name_file,
                                upload_date: row.upload_date,
                                ext: mime.extension(mime.contentType(row.name_file))
                            });

                            resolve(return_arr);
                        } else { // файл не существует физически
                            errorlog(`REQUESTED FILE IS NOT FOUND ON DISK. PATH: ${filePath}, ID: ${pk_file}`);
                            reject('REQUESTED FILE IS NOT FOUND ON DISK');
                        }
                    });
                }
            })
            .catch(err => {
                errorlog(err);
                reject();
            });
    });
};

module.exports = upload_files;
