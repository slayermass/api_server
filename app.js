const
    express = require('express'),
    app = express(),
    path = require('path'),
    port = require('./config').port,
    compression = require('compression'),
    bodyParser = require('body-parser'),
    errorlog = require('./functions').error;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.setHeader('Access-Control-Allow-Methods', 'POST,DELETE');

    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    res.setHeader('Access-Control-Allow-Credentials', false);
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());
app.disable('x-powered-by');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res){//загрузчик многих фото
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.use('/api', require('./api/public'));//публичное api

app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function (err, req, res, next) {
    let status = err.status || 500;
    res.sendStatus(status);
    errorlog(err);
    console.log(err);
});

/**app.get('/canvas', function(req, res){
    res.sendFile(path.join(__dirname, 'views/canvas.html'));
});

app.get('/cropper', function(req, res){//загрузчик и обрезчик
    res.sendFile(path.join(__dirname, 'views/cropper.html'));
});*/

const server = app.listen(port, function(){
  console.log('Server listening on port ' + port);
});
