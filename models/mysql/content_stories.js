"use strict";

let model = function(){};

const
    TABLE_NAME = 'content_stories',
    mysql = require('../../db/mysql'),
    errorlog = require('../../functions').error,
    Entities = require('html-entities').XmlEntities,
    entities = new Entities(),
    empty = require('is-empty');

mysql.formatBind();

/**
 * вывод всех сюжетов
 */
model.getAll = async (fk_site) => {
    let data = await new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "`  WHERE `fk_site` = :fk_site " +
                " ORDER BY `pk_content_story` DESC;", {
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
            .getSqlQuery("SELECT COUNT(*) AS count FROM `" + TABLE_NAME + "`  WHERE `fk_site` = :fk_site;", {
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
            .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`title_content_story`, `fk_site`)" +
                " VALUES (:title_content_story, :fk_site);", {
                fk_site,
                title_content_story: entities.encode(content_story.title_content_story)
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
 * get a table name of model
 * @returns {string}
 */
model.getTableName = () => {
    return TABLE_NAME;
};

module.exports = model;
