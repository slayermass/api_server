const
    mysql = require('../db/mysql_sphinx');

mysql.formatBind();

let search = "новый";

mysql
    .getSqlQuery('SELECT `id` FROM all WHERE MATCH(:search) ORDER BY create_date DESC LIMIT 10', {
        //.getSqlQuery('SELECT * FROM all ORDER BY id DESC LIMIT 10', {
        search
    })
    .then(data => {
        console.log(data)
    })
    .catch(err => {
        console.error(err)
    });
