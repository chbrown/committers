#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var path = require('path');
var amulet = require('amulet').set({minify: true, root: path.join(__dirname, '..', 'templates')});
var http = require('http-enhanced');
var Router = require('regex-router');
var Cookies = require('cookies');

var logger = require('loge');

Cookies.prototype.defaults = function() {
  var expires = new Date(Date.now() + 31*86400 *1000); // 1 month
  return {path: '/', expires: expires};
};

var R = new Router(function(req, res) {
  res.die(404, 'Sorry, that route is not available yet.');
});

R.get(/^\/favicon.ico/, function(req, res) {
  res.die(404, 'Favicon is not available directly');
});

var argv = require('optimist').default({port: 3691, hostname: '127.0.0.1'}).argv;

http.createServer(function(req, res) {
  req.cookies = new Cookies(req, res);

  var started = Date.now();
  res.on('finish', function() {
    logger.info('duration', {url: req.url, method: req.method, ms: Date.now() - started});
  });

  R.route(req, res);
}).listen(argv.port, argv.hostname, function() {
  logger.info('Listening on %s:%d', argv.hostname, argv.port);
});
