const router = require('express').Router();

const
    path = require('path'),
    fs = require('fs'),
    multer  = require('multer'),
    readChunk = require('read-chunk'),
    fileType = require('file-type'),
    pathExists = require('path-exists'),
    errorlog = require('../../functions').error,
    mime = require('mime-types'),
    del = require('del'),
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
 * загрузка файлов
 *
 * @param {Array} files - массив файлов для загрузки
 *
 * @returns {json}
 *      {Bool} success - успешность загрузки
 *      {Array} files  - массив названий файлов
 */
router.post('/upload', upload.any(), function(req, res, next) {
    let files = [],
        filesData = [],
        fk_site = parseInt(req.body.fk_site);

    if(isNaN(fk_site)) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        if (req.files !== undefined) {
            for (let i = 0; i < req.files.length; i++) {
                let fpath = req.files[i].path;

                //точная проверка еще раз
                const buffer = readChunk.sync(fpath, 0, 4100);

                if (buffer === null || allowExts.indexOf(fileType(buffer).ext) === -1) {
                    fs.unlink(fpath, function (err) {
                        if (err) throw err;
                        console.log(fpath + " deleted");
                    });
                } else {
                    filesData.push({
                        original_name_file: req.files[i].originalname,
                        name_file: req.files[i].filename,
                        path: req.files[i].destination
                    });
                }
            }

            //сохранение в бд
            upload_files
                .onNewFiles(fk_site, filesData)
                .then(files_data => {
                    res.json({success: true, files: files_data});
                })
                .catch(err => {
                    res.json({success: false, errors: 'имеются'});
                });
        } else {
            res.json({success: false});
        }
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

/**
 * удаление файла одиночное
 *
 * @param {string} n - название файла
 */
router.delete('/upload', (req, res, next) => {
    let files = [];

    //преобразование к массиву
    if(!Array.isArray(req.body.files)) {
        files.push(req.body.files);
    } else {
        files = req.body.files;
    }

    if(files.length === 0) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        //найти расположение файлов
        upload_files
            .findPathByNames(files)
            .then(data => {
                let resPaths = [];

                //собрать пути
                for(let i = 0; i < data.length; i ++) {
                    resPaths.push(data[i].path + '/' + data[i].name_file);
                }

                //удаление с другого диска
                del(resPaths, { force: true })
                    .then(() => {
                        //удаление из базы
                        upload_files
                            .deleteByNames(files);

                        res.json(200);
                    });
            })
            .catch(() => {
                let err = new Error();
                err.status = 404;
                next(err);
            });
    }
});

/**
 * получить список файлов
 *
 * @see upload_files.findApi
 */
router.get('/upload/list', (req, res, next) => {
    const
        qlimit = parseInt(req.query.limit, 10),
        limit = (qlimit && qlimit < 50) ? qlimit : 50,
        fk_site = parseInt(req.query.fk_site);

    if(isNaN(fk_site)) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        upload_files
            .findApi(fk_site, limit)
            .then(data => {
                res.send(data);
            })
            .catch(() => {
                let err = new Error();
                err.status = 500;
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
