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

    //разрешенные расширения
    allowExts = ['jpg', 'jpeg', 'gif', 'png', 'zip', 'mp4'],
    //папка для сохранения
    path_to_save_global = require('../../config').path_to_save_global,

    date = new Date(),
    day = (date.getDate() < 10) ? `0${date.getDate()}` : date.getDate(),
    month = (date.getMonth() < 10) ? `0${date.getMonth()}` : date.getMonth(),
    upload_path = `${path_to_save_global}${date.getFullYear()}`,
    upload_destiny = `${day}_${month}`,
    full_path = upload_path + '/' + upload_destiny,

    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            //проверка существования пути
            pathExists(upload_path)
                .then(exists => {
                    if(exists === false) {
                        fs.mkdirSync(upload_path);
                    }
                })
                .then(() => {
                    pathExists(full_path)
                        .then(exists => {
                            if(exists === false) {
                                fs.mkdirSync(full_path);
                            }
                        })
                        .then(() => {
                            //полный путь
                            cb(null, full_path);
                        });
                })
                .catch(err => {
                    errorlog(err);
                    cb(null);
                });
        },
        filename: function (req, file, cb) {
            let ext = path.extname(file.originalname);
            cb(null, Date.now() + ext);
        }
    }),

    upload = multer({
        storage: storage,
        fileFilter: function(req, file, cb) {
            let ext = path.extname(file.originalname);

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
 * @returns {Json}
 *      {Bool} success - успешность загрузки
 *      {Array} files  - массив названий файлов
 */
router.post('/upload', upload.any(), function(req, res){
    let files = [];

    if(req.files !== undefined) {
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
                files.push(req.files[i].filename);
            }
        }

        res.json({success: true, files});
    } else {
        res.json({success: false});
    }
});

/**
 * потоковая отдача файлов
 *
 * @param {string} n - название файла
 */
router.get('/upload/:n', (req, res, next) => {
    if(!req.params.n) {
        let err = new Error();
        err.status = 400;
        next(err);
    } else {
        const filePath = full_path + '/' + req.params.n;
        fs.exists(filePath, (exists) => {
            if (exists) {
                let stat = fs.statSync(filePath);

                res.writeHead(200, {
                    'Content-Type': mime.contentType(req.params.n),
                    'Content-Length': stat.size
                });

                let readStream = fs.createReadStream(filePath);
                readStream.pipe(res);
            } else {
                let err = new Error();
                err.status = 404;
                next(err);
            }
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
        let resPaths = [];

        for(let i = 0; i < files.length; i ++) {
            resPaths.push(full_path + '/' + files[i]);
        }

        del(resPaths)
            .then(paths => {
                console.log(paths);
                res.json(200);
            });
    }
});

module.exports = router;
