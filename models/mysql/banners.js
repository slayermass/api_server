"use strict";

let model = function(){};

const
    TABLE_NAME = 'banners',
    mysql = require('../../db/mysql'),
    errorlog = require('../../functions').error,
    Entities = require('html-entities').XmlEntities,
    entities = new Entities();

mysql.formatBind();

/**
 * создание/обновление баннеров
 *
 *
 * @param {Object} params
 *      @param {in} fk_site - ид ресурса
 *      @param {date} date_since - дата активности баннера от
 *      @param {date} date_to - дата активности баннера до
 *      @param {text} script_banner - содержимое баннера(любое)
 *      @param {int} banner_pos - позиция баннера
 */
model.save = async (params) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("INSERT INTO `" + TABLE_NAME + "` (`pos_banner`, `date_since`, `date_to`, `script_banner`, `fk_site`)" +
                " VALUES (:pos_banner, :date_since, :date_to, :script_banner, :fk_site);", {
                pos_banner  : params.banner_pos,
                date_since  : params.date_since,
                date_to     : params.date_to,
                script_banner : entities.encode(params.script_banner),
                fk_site     : params.fk_site
            })
            .then(rows => {
                resolve(rows.insertId);
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

model.update = async (params) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("UPDATE `" + TABLE_NAME + "` " +
                " SET `date_since` = :date_since, `date_to` = :date_to, `script_banner` = :script_banner " +
                " WHERE `fk_site` = :fk_site AND `pos_banner` = :pos_banner AND `id_banner` = :id_banner;", {
                pos_banner  : params.banner_pos,
                id_banner   : params.id_banner,
                date_since  : params.date_since,
                date_to     : params.date_to,
                script_banner : entities.encode(params.script_banner),
                fk_site     : params.fk_site
            })
            .then(()=> {
                resolve();
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

/**
 * инфа о баннере
 *
 * @param {Object} params
 *      @param {in} fk_site - ид ресурса
 *      @param {int} banner_pos - позиция баннера
 */
model.infoBanner = async (params) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT * FROM `" + TABLE_NAME + "` WHERE `fk_site` = :fk_site AND `pos_banner` = :pos_banner;", {
                pos_banner  : params.banner_pos,
                fk_site     : params.fk_site
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
 * еще не определился с логикой выборки
 * @param params
 * @returns {Promise<any>}
 */
model.infoBannerPublic = async (params) => {
    return new Promise((resolve, reject) => {
        mysql
            .getSqlQuery("SELECT `script_banner`, `id_banner`, `pos_banner` FROM `" + TABLE_NAME + "` " +
                " WHERE `fk_site` = :fk_site AND `date_since` <= CURDATE() AND `date_to` >= CURDATE();", {
                fk_site     : params.fk_site
            })
            .then(rows => {
                let arr = {};

                for(let i = 0; i < rows.length; i ++) {
                    arr[rows[i].pos_banner] = rows[i];
                    delete rows[i].pos_banner;
                }

                resolve(arr);
            })
            .catch(err => {
                errorlog(err);
                reject(err);
            });
    });
};

module.exports = model;
