// indexer --rotate --all
// sudo systemctl restart sphinxsearch.service
// sudo systemctl status sphinxsearch.service
// http://chakrygin.ru/2013/07/sphinx-search.html
// интересное - http://chakrygin.ru/2013/07/sphinx-search.html
// презентация - http://astellar.com/downloads/2014-Vladimir-Fedorkov-DevConf-2014-Sphinx-based-search-services-rus.pdf

// после вставки в бд - вставка в sphinx RT index:
// INSERT INTO sosrt(id, title, content, create_date) VALUES (101956, 'пожарник угорел', 'пожарник угорел', 1523307600);

const
    mysql = require('../db/mysql_sphinx_local');

mysql.formatBind();

let search = "президент";

mysql
    .getSqlQuery('SELECT `id` FROM politsibru WHERE MATCH(:search) ORDER BY publish_date DESC LIMIT 0,10', {
        //.getSqlQuery('SELECT * FROM all ORDER BY id DESC LIMIT 10', {
        search
    })
    .then(data => {
        console.log(data)
    })
    .catch(err => {
        console.error(err)
    });
