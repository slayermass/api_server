let checkPublishUpdate = require('../models/mysql/content').checkPublishUpdate;
let errorlog = require('../functions').error;

/**
 * декоратор для подсчета времени выполнения
 * @param {Function} f
 * @returns {Function}
 */
function timingDecorator(f) {
    return function () {
        console.time('checkPublishUpdate');

        let result = f.apply(this, arguments);

        console.timeEnd('checkPublishUpdate');

        return result;
    }
}

checkPublishUpdate = timingDecorator(checkPublishUpdate);

/**
 * запуск функции проверки/обновления контента
 * раз в 1 минуту
 */
checkPublishUpdate()
    .then(count => {
        console.log('опубликовано: ' + count);
        process.exit(process.exitCode);
    })
    .catch(err => {
        errorlog(err);
        process.exit(process.exitCode);
    });

console.log('cron just started');
