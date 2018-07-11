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

    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, auth_id');

    res.setHeader('Access-Control-Allow-Credentials', false);
    next();
});

app.use(express.static(path.join(__dirname, 'protected')));
app.use(compression());
app.disable('x-powered-by');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', require('./api/protected'));//закрытое api
app.use('/papi', require('./api/public'));//публичное api

app.use((req, res, next) => {
    let err = new Error('Not Found');
    err.status = 404;
    err.message = `404 URL: ${req.originalUrl}`;
    next(err);
});

app.use(function (err, req, res, next) {
    let status = err.status || 500;
    res.sendStatus(status);
    errorlog(err);
});

const server = app.listen(port, function(){
  console.log('Server listening on port ' + port);
});

module.exports = server;
