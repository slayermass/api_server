const fs = require('fs'),
    Log = require('log'),
    logger = new Log('debug', fs.createWriteStream('my.log')),
    Entities = require('html-entities').AllHtmlEntities,
    entities = new Entities();

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
