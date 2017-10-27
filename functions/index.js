const fs = require('fs'),
    Log = require('log'),
    logger = new Log('debug', fs.createWriteStream('my.log'));

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
