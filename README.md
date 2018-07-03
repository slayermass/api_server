crontab -e

@reboot NODE_ENV=production npm start --prefix /var/www/api_server/
*/1 * * * * NODE_ENV=production npm run startcron --prefix /var/www/api_server/
