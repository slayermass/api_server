const router = require('express').Router();

const fs = require('fs');
const mime = require('mime-types');
const BadRequestError = require('../../functions').BadRequestError;
const NotFoundError = require('../../functions').NotFoundError;
const upload_files = require('../../models/mysql/upload_files');

/**
 * потоковая отдача файлов
 * TODO OLD удалить, неудачная идея, отдача статики нужна через nginx
 *
 * @param {string} n - название файла
 */
router.get('/upload/f/:n', (req, res, next) => {
    if(!req.params.n) {
        next(BadRequestError());
    } else {
        //найти в базе
        upload_files
            .findByNameFile(req.params.n)
            .then(data => {
                const filePath = data.path + '/' + data.name_file;

                //проверить наличие файла
                fs.exists(filePath, (exists) => {
                    if (exists) {
                        let stat = fs.statSync(filePath);

                        res.writeHead(200, {
                            'cache-control': 'max-age=31536000',
                            'content-Type': mime.contentType(req.params.n),
                            'content-Length': stat.size
                        });

                        let readStream = fs.createReadStream(filePath);
                        readStream.pipe(res);
                    } else {
                        next(NotFoundError());
                    }
                });
            })
            .catch(() => {
                next(NotFoundError());
            });
    }
});

module.exports = router;
