"use strict";

let model = function(){};

const
    TABLE_NAME = 'content_stories',
    mysql = require('../../db/mysql'),
    errorlog = require('../../functions').error,
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    async = require('async'),
    empty = require('is-empty');

mysql.formatBind();

/**
 * вывод всех сюжетов
 * TODO cache
 */
model.getAll = async (fk_site, is_active) => {
    let add_sql = '';

    if(is_active) { // только активные
        add_sql = ' AND `is_active` = 1 ';
    }

    let data = await new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "`  WHERE `fk_site` = :fk_site " + add_sql +
                " ORDER BY `sort` ASC;", {
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

    let count = await new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT COUNT(*) AS count FROM `" + TABLE_NAME + "`  WHERE `fk_site` = :fk_site " + add_sql + ";", {
                fk_site
            })
            .then(rows => {
                resolve(rows[0]);
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });

    return {
      data,
      count: count['count']
    };
};

/**
 * создание сюжета
 * @param fk_site
 * @param content_story
 * @returns {Promise<void>}
 */
model.create = async (fk_site, content_story) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`title_content_story`, `fk_site`, `is_active`)" +
                " VALUES (:title_content_story, :fk_site, :is_active);", {
                fk_site,
                title_content_story: entities.encode(content_story.title_content_story),
                is_active: content_story.is_active
            })
            .then(() => {
                resolve({success:true});
            })
            .catch(err => {
                errorlog(err);
                reject({success:false});
            });
    });
};

/**
 * обновление сюжета
 */
model.update = async (fk_site, content_story) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("UPDATE `" + TABLE_NAME + "` SET `title_content_story` = :title_content_story," +
                " `fk_site` = :fk_site, `is_active` = :is_active WHERE `pk_content_story` = :pk_content_story;", {
                fk_site,
                title_content_story: entities.encode(content_story.title_content_story),
                is_active: content_story.is_active,
                pk_content_story: content_story.pk_content_story
            })
            .then(() => {
                resolve({success:true});
            })
            .catch(err => {
                errorlog(err);
                reject({success:false});
            });
    });
};

/**
 * сортировка сюжетов
 */
model.saveSort = (fk_site, saveSort) => {
    let farr = [];

    // console.log(fk_site, saveSort);return;

    //prepare executable string
    for (let i = 0; i < saveSort.length; i++) {
        farr.push(
            function (callback) {
                mysql
                    .getSqlQuery("UPDATE `" + TABLE_NAME + "` SET `sort` = :sort WHERE `pk_content_story` = :pk_content_story AND `fk_site` = :fk_site", {
                        sort: parseInt(saveSort[i].sort, 10),
                        pk_content_story: parseInt(saveSort[i].id, 10),
                        fk_site
                    })
                    .then(() => {
                        callback(null);
                    })
                    .catch(err => {
                        errorlog(err);
                        callback(err);
                    });
            }
        );
    }

    //динамический параллельный
    return new Promise((resolve, reject) => {
        async.parallel(farr, (err, results) => {
            if (err) reject();
            resolve(results);
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
