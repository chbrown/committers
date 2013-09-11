#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var fs = require('fs');
var path = require('path');
var async = require('async');
var child_process = require('child_process');

var inspect = require('eyes').inspector({maxLength: 512}); // or 65536
var git = require('../apis/nodegit');
var models = require('../lib/models');
var logger = require('../lib/logger');

var commands = {
  addusers: function(argv) {
    // Add several users by user name.
    var logins = argv._.slice(1);
    console.error('Adding users: ' + logins.join(', '));
    async.each(logins, function(login, done) {
      var user = new models.User({login: login});
      user.save(done);
    }, function(err) {
      console.error('Done');
    });
  },
  ls: function(optimist) {
    // Load in the module.
    var argv = optimist.check(function(argv) {
      // argv._[0] is necessarily the command (else we wouldn't be here)
      if (argv._.length != 2) {
        // the other
        throw new Error('committers-cli ls requires exactly one positional argument');
      }
    }).argv;

    var uri = argv._[1];
    git.printRepo(uri);
  }
};

if (require.main === module) {
  var basic = require('optimist')
    .usage('committers-cli [--options] <command> [arguments]')
    .describe({
      accounts: 'File containing list of github APIv3 tokens. Defaults to ~/.github',
    })
    .default({
      accounts: '~/.github'
    })
    .boolean(['help', 'verbose']);

  var argv = basic.argv;

  if (argv.verbose) {
    logger.level = 'debug';
  }

  commands[argv._[0]](basic);
}
