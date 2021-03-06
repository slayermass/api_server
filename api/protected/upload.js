const router = require('express').Router();

const MY_NAMESPACE = require("../../config/index").uuid;
const uuidv5 = require('uuid/v5');

const
    path = require('path'),
    fs = require('fs'),
    multer  = require('multer'),
    // fileType = require('file-type'),
    pathExists = require('path-exists'),
    errorlog = require('../../functions').error,
    // mime = require('mime-types'),
    del = require('del'),
    upload_files = require('../../models/mysql/upload_files'),
    BadRequestError = require('../../functions').BadRequestError,
    InternalServerError = require('../../functions').InternalServerError,
    getSavePathAsync = require('../../functions').getSavePathAsync,

    //разрешенные расширения по mimetype
    allowExts = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif'],
    //allowExts = ['jpg', 'jpeg', 'gif', 'png', 'zip', 'mp', 'rar'],

    //папка для сохранения
    path_to_save_global = require('../../config').path_to_save_global,

    storage = multer.diskStorage({
        destination: async function (req, file, cb) {
            //проверка существования пути
            let {full_path} = await getSavePathAsync();

            if (full_path) {
                cb(null, full_path);
            } else {
                cb(null);
            }
        },
        filename: function (req, file, cb) {
            // uuid + random name
            let file_name = uuidv5(`${Date.now()}_${parseInt(Math.random() * 100000)}`, MY_NAMESPACE);
            let ext = path.extname(file.originalname);

            cb(null, `${file_name}${ext}`);
        }
    }),

    upload = multer({
        storage: storage,
        fileFilter: function(req, file, cb) {
            // проверка по mimetype файла
            if (allowExts.includes(file.mimetype)) {
                return cb(null, true);
            } else {
                errorlog(`Некорректный тип загружаемого файла. Mimetype: '${file.mimetype}', filename: '${file.originalname}'`);
                return cb(null, false); // просто пропускать
            }
        }
    });

/**
 * добавление файла в библиотеку по ссылке
 *
 * @see upload_files.newByLink
 */
router.post('/upload_link', (req, res, next) => {
    let name = req.body.name,
        link = req.body.link,
        fk_site = parseInt(req.body.fk_site, 10);

    if ((isNaN(fk_site) || fk_site < 1) || link.length < 5) {
        next(BadRequestError());
    } else {
        upload_files
            .newByLink(fk_site, link, name)
            .then((success) => {
                res.json({success: success});
            })
            .catch(err => {
                errorlog(err);
                res.json({success: false, errors: 'имеются'});
            });
    }
});

/**
 * загрузка файлов
 *
 * @param {Array} files         - массив файлов для загрузки
 * @param {int} fk_site         - ид сайта
 * @param {String(45)} folder   - папка для загрузки(метка)
 *
 * @returns {json}
 *      {Bool} success - успешность загрузки
 *      {Array} files  - массив названий файлов
 */
router.post('/upload', upload.any(), (req, res, next) => {
    if (req.files !== undefined) {
        const folder = req.body.folder || false;

        // если указана папка - переместить в нее
        if (folder) {
            pathExists(`${path_to_save_global}${folder}`)
                .then(exists => {
                    if (exists === false) {
                        fs.mkdirSync(`${path_to_save_global}${folder}`);
                    }
                })
                .then(() => {
                    for (let i = 0; i < req.files.length; i++) {
                        fs.renameSync(req.files[i].path, `${path_to_save_global}${folder}/${req.files[i].filename}`);

                        req.files[i].destination = `${path_to_save_global}${folder}`;
                        req.files[i].path = `${path_to_save_global}${folder}/${req.files[i].filename}`;
                        req.files[i].folder = folder;
                    }

                    next();
                });

        } else {
            next();
        }
    } else {
        res.json({success: false});
    }
}, (req, res, next) => {
    let filesData = [],
        file_id = parseInt(req.body.file_id, 10) || false, // не массив
        fk_site = parseInt(req.body.fk_site, 10);

    if (isNaN(fk_site) || fk_site < 1) {
        next(BadRequestError());
    } else {
        for (let i = 0; i < req.files.length; i++) {
            filesData.push({
                original_name_file: req.files[i].originalname,
                name_file: req.files[i].filename,
                path: req.files[i].destination,
                folder: req.files[i].folder
            });
        }

        if (file_id) { // обновить по ид
            upload_files
                .onReplaceFiles(fk_site, filesData, file_id)
                .then(files_data => {
                    res.json({success: true, files: files_data});
                })
                .catch(() => {
                    res.json({success: false, errors: 'имеются'});
                });
        } else {
            //сохранение в бд
            upload_files
                .onNewFiles(fk_site, filesData)
                .then(files_data => {
                    res.json({success: true, files: files_data});
                })
                .catch(() => {
                    res.json({success: false, errors: 'имеются'});
                });
        }
    }
});

/**
 * удаление файлов
 *
 * @param {string} n - название файла
 */
router.delete('/upload', (req, res, next) => {
    let files = [],
        pk_files = [],
        fk_site = parseInt(req.body.fk_site, 10);

    //преобразование к массиву названия файлов
    if(req.body.files === undefined) {

    } else if(!Array.isArray(req.body.files)) {
        files.push(req.body.files);
    } else {
        files = req.body.files;
    }

    //преобразование к массиву ид файлов
    if(req.body.pk_files === undefined) {

    } else if(!Array.isArray(req.body.pk_files)) {
        pk_files.push(req.body.pk_files);
    } else {
        pk_files = req.body.pk_files;
    }

    if((pk_files.length === 0 || files.length === 0) && isNaN(fk_site)) {
        next(BadRequestError());
    } else if(pk_files.length) {
        upload_files
            .findPathByIds(fk_site, pk_files)
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
                            .deleteByIds(pk_files);

                        res.json(200);
                    });
            })
            .catch(() => {
                next(BadRequestError());
            });
    } else {
        //найти расположение файлов
        upload_files
            .findPathByNames(fk_site, files)
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
                next(BadRequestError());
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
        limit = (qlimit && qlimit < 20) ? qlimit : 20, // слишком много сразу - виснет браузер
        fk_site = parseInt(req.query.fk_site, 10),
        folder = req.query.folder || null;

    if(isNaN(fk_site)) {
        next(BadRequestError());
    } else {
        upload_files
            .findApi(fk_site, limit, [], folder)
            .then(data => {
                res.send(data);
            })
            .catch(() => {
                next(InternalServerError());
            });
    }
});

/**
 * получить инфо по файлу
 *
 * @see upload_files.getInfoFile
 */
router.get('/upload/infoFile', (req, res, next) => {
    const
        pk_file = parseInt(req.query.pk_file, 10),
        fk_site = parseInt(req.query.fk_site, 10);

    if(isNaN(fk_site) || isNaN(pk_file)) {
        next(BadRequestError());
    } else {
        upload_files
            .getInfoFile(fk_site, pk_file)
            .then(data => {
                res.send(data);
            })
            .catch(() => {
                next(InternalServerError());
            });
    }
});

module.exports = router;
