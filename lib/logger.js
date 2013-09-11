var winston = require('winston');

var logger = module.exports = new winston.Logger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({filename: '/usr/local/var/log/committers.log'})
  ]
});

logger.level = 'verbose';