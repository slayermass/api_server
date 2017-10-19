const router = require('express').Router();

const
    path = require('path'),
    fs = require('fs'),
    multer  = require('multer'),
    pathExists = require('path-exists'),
    errorlog = require('../../functions').error,
    mime = require('mime-types'),
    upload_files = require('../../models/mysql/upload_files'),

    //разрешенные расширения
    allowExts = ['jpg', 'jpeg', 'gif', 'png', 'zip', 'mp', 'rar'],
    //папка для сохранения
    path_to_save_global = require('../../config').path_to_save_global,

    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            //проверка существования пути
            pathExists(getSavePath().upload_path)
                .then(exists => {
                    if(exists === false) {
                        fs.mkdirSync(getSavePath().upload_path);
                    }
                })
                .then(() => {
                    pathExists(getSavePath().full_path)
                        .then(exists => {
                            if(exists === false) {
                                fs.mkdirSync(getSavePath().full_path);
                            }
                        })
                        .then(() => {
                            //полный путь
                            cb(null, getSavePath().full_path);
                        });
                })
                .catch(err => {
                    errorlog(err);
                    cb(null);
                });
        },
        filename: function (req, file, cb) {
            let ext = path.extname(file.originalname);

            cb(null, `${Date.now()}_${parseInt(Math.random() * 100000)}${ext}`); // имя должно быть точно уникальным
        }
    }),

    upload = multer({
        storage: storage,
        fileFilter: function(req, file, cb) {
            let ext = path.extname(file.originalname);

            console.log(ext.toLowerCase().replace(/[^a-zA-Z]+/g, ""));
            //проверка по разрешению файла
            if(allowExts.indexOf(ext.toLowerCase().replace(/[^a-zA-Z]+/g, "")) === -1) {
                return cb(null, false);//просто пропускать
            }

            cb(null, true);
        }
    });

/**
 * потоковая отдача файлов
 *
 * @param {string} n - название файла
 */
router.get('/upload/f/:n', (req, res, next) => {
    if(!req.params.n) {
        let err = new Error();
        err.status = 400;
        next(err);
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
                let err = new Error();
                err.status = 404;
                next(err);
            });
    }
});

module.exports = router;

/**
 * определение пути для сохранения файлов
 *
 * @returns {{upload_path: string, upload_destiny: string, full_path: string}}
 */
function getSavePath() {
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
}
