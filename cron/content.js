let checkPublishUpdate = require('../models/mysql/content').checkPublishUpdate;

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
setInterval(function () {
    checkPublishUpdate()
        .then(count => {
            //console.log(count);
        })
        .catch(() => {

        });
}, 1000 * 60);

console.log('cron started');
