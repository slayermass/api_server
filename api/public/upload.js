const router = require('express').Router();

const
    fs = require('fs'),
    mime = require('mime-types'),
    BadRequestError = require('../../functions').BadRequestError,
    upload_files = require('../../models/mysql/upload_files');

/**
 * потоковая отдача файлов
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
                            'Content-Type': mime.contentType(req.params.n),
                            'Content-Length': stat.size,
                            'Content-Disposition': `filename="${encodeURIComponent(data.original_name_file)}"`
                        });

                        let readStream = fs.createReadStream(filePath);
                        readStream.pipe(res);
                    } else {
                        let err = new Error();
                        err.status = 404;
                        next(err);
                    }
                });
            })
            .catch(() => {
                next(BadRequestError());
            });
    }
});

module.exports = router;
