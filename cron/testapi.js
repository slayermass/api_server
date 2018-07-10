const
    mysql = require('../db/mysql_sphinx');

mysql.formatBind();

let search = "новый";

mysql
    .getSqlQuery('SELECT `id` FROM all WHERE MATCH(:search) ORDER BY create_date DESC LIMIT 10', { // LIMIT 5, 10 - LIMIT 10 OFFSET 5
        //.getSqlQuery('SELECT * FROM all ORDER BY id DESC LIMIT 10', {
        search
    })
    .then(data => {
        console.log(data)
    })
    .catch(err => {
        console.error(err)
    });
