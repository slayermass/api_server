crontab -e

заполнить

# nginx.conf
underscores_in_headers on;

//sphinx
/usr/bin/indexer --rotate --config /etc/sphinx/sphinx.conf --all
sudo systemctl restart searchd

# nginx настройки хоста
# serve static files
location / {
    try_files $uri $uri/ =404;
}

# node.js api_server
location /papi/ {
    proxy_pass http://127.0.0.1:3001; #адрес и порт
}

location /api/ {
    proxy_pass http://127.0.0.1:3001;
}