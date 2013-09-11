'use strict'; /*jslint es5: true, node: true, indent: 2 */
var async = require('async');
var gift = require('gift');
var inspect = require('eyes').inspector();

var logger = require('../lib/logger');

function gift_ls(repository_path) {
  var repository = gift(repository_path);
  repository.commits('master', 10000, 0, function(err, commits) {
    async.each(commits, function(commit, callback) {
      commit.parents_ids = [];
      async.each(commit.parents(), function(parent, callback) {
        commit.parents_ids.push(parent.id);

        console.log(commit.id, parent.id);
        repository.diff(parent.id, commit.id, function(err, diffs) {
          logger.maybeError(err);
          inspect(diffs);
          callback();
        });

      }, callback);
      // inspect(commit);

    }, function(err) {
      logger.maybeError(err);
      console.log('Done');
    });
    // inspect(commits);

  });
}
