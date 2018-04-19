const fs = require('fs'),
    Log = require('log'),
    logger = new Log('debug', fs.createWriteStream('my.log')),
    Entities = require('html-entities').AllHtmlEntities,
    entities = new Entities(),
    pathExists = require('path-exists'),
    //папка для сохранения
    path_to_save_global = require('../config').path_to_save_global;

/**
 * логирование общее
 *
 * @param {String} err - описание ошибки
 */
module.exports.error = (err) => {
    logger.error(err);
    console.log(err);
};

/**
 * декодирование кодированного html
 *
 * @param {String} html
 * @returns {String}
 */
module.exports.decodeHtml = (html) => {
    return entities.decode(html);
};

/**
 * вернуть гарантированный массив
 *
 * @param {String|number} param - любое значение
 */
module.exports.doArray = (param) => {
    if (!Array.isArray(param)) {
        param = [param];
    }

    return param;
};

/**
 * поиск по параметрам, условие поиска от типа поля
 * для php поисков
 *
 * @param {Object} search - { val: '', type: '' }
 */
module.exports.addWhere = (search) => {
    let add_where = '';

    for (let attr in search) {
        if (search[attr].type === 'integer') {
            add_where += ` AND \`${attr}\` = ${search[attr].val}`;
        } else { //string
            add_where += ` AND \`${attr}\` LIKE '%${search[attr].val}%'`; // entities.encode() - кодирует в непонятное
        }
    }

    return add_where;
};

/**
 * except an error - http code 400
 *
 * @param {String} msg - Human-readable description of the error.
 *
 * @returns Error
 */
module.exports.BadRequestError = (msg = '') => {
    let err = new Error(msg);
    err.status = 400;
    return err;
};

/**
 * except an error - http code 500
 *
 * @param {String} msg - Human-readable description of the error.
 *
 * @returns Error
 */
module.exports.InternalServerError = (msg = '') => {
    let err = new Error(msg);
    err.status = 450;
    return err;
};

/**
 * вычленять из текста куски шорткодов(файлы, изображения)
 *
 * @param {HTML} html
 * @returns {Array}
 */
module.exports.getIdsFromShortcodes = (html) => {
    let return_ids = [];

    html = module.exports.decodeHtml(html);

    if (html.includes('[gallery')) {
        // обычно в теге <p> tinymce создает
        html.replace(/<p>\[gallery([^\]]*)\]<\/p>/g, (all, ids) => {
            ids = ids.split('"');
            ids = ids[1].split(',');

            for (let i = 0; i < ids.length; i++) {
                return_ids.push(parseInt(ids[i], 10));
            }
        });
    }

    return return_ids;
};

/**
 * определение пути для сохранения файлов
 *
 * @returns {{upload_path: string, upload_destiny: string, full_path: string}}
 */
module.exports.getSavePath = function () {
    let date = new Date(),
        day = (date.getDate() < 10) ? `0${date.getDate()}` : date.getDate(),
        month = (date.getMonth() < 10) ? `0${date.getMonth()}` : date.getMonth(),
        upload_path = `${path_to_save_global}${date.getFullYear()}`,
        upload_destiny = `${day}_${month}`,
        full_path = upload_path + '/' + upload_destiny;

    return {
        upload_path,
        upload_destiny,
        full_path
    };
};


module.exports.getSavePathAsync = async function () {
    let date = new Date(),
        day = (date.getDate() < 10) ? `0${date.getDate()}` : date.getDate(),
        month = (date.getMonth() < 10) ? `0${date.getMonth()}` : date.getMonth(),
        upload_path = `${path_to_save_global}${date.getFullYear()}`,
        upload_destiny = `${day}_${month}`,
        full_path = upload_path + '/' + upload_destiny;

    try {
        let exists_upload_path = await pathExists(upload_path);

        if (exists_upload_path === false) {
            fs.mkdirSync(upload_path);
        }

        let exists_full_path = await pathExists(full_path);

        if (exists_full_path === false) {
            fs.mkdirSync(full_path);
        }
    } catch (err) {
        error(err);
    }

    return {
        upload_path,
        upload_destiny,
        full_path
    };
};
