const fs = require('fs'),
    Log = require('log'),
    logger = new Log('debug', fs.createWriteStream('my.log')),
    Entities = require('html-entities').XmlEntities,
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
            add_where += ` AND \`${attr}\` LIKE '%${entities.encode(search[attr].val)}%'`;
        }
    }

    return add_where;
};
