const fs = require('fs'),
    Log = require('log'),
    logger = new Log('debug', fs.createWriteStream('my.log'));

/**
 * логирование общее
 *
 * @param err - описание ошибки
 */
module.exports.error = (err) => {
    logger.error(err);
    console.log(err);
}
