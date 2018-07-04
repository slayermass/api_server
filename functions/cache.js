const redis = require("redis");
const client = redis.createClient();
const empty = require('is-empty');

client.on("error", function (err) {
    console.log("Error " + err);
});

/**
 * hset
 * @param key
 * @param field
 * @param value
 */
module.exports.hset = (key, field, value) => {
    value.cached = true;

    client.hset(key, field, JSON.stringify(value));
};

/**
 * hget
 * @param key
 * @param field
 * @returns {Promise<*>}
 */
module.exports.hget = async (key, field) => {
    try {
        const cachedata = await new Promise((resolve, reject) => {
            client.hget(key, field, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(result));
                }
            });
        });

        if(cachedata === null) {

        } else {
            // если есть признак кэширования и не пустой объект - отдать
            if (cachedata.cached && !empty(cachedata)) {
                //console.log(`key: '${key}', field: '${field}' из кеша`);
                delete cachedata.cached; // удалить признак кэширования
                return cachedata;
            }
        }
    } catch(err) {
        // ничего, идти дальше
    }

    //console.log(`key: '${key}', field: '${field}' нет в кэше`);
    return false;
};

/**
 * очистка всех баз, всего кэша
 * flushdb
 */
module.exports.flushdb = () => {
    client.flushdb( function (err, succeeded) {
        console.log(succeeded);
    });
};
