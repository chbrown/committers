'use strict'; /*jslint es5: true, node: true, indent: 2 */
var async = require('async');
var path = require('path');
var nodegit = require('nodegit');

var logger = require('loge');



// Careful, this file contains a lot of unmigrated code that was written for
// the pre-WIP (before 0.1.0) version of nodegit. That implementation had
// lots of memory errors, but some of the code / intent might be useful
// going forward.



var GIT_DELTA_TYPES = ['GIT_DELTA_UNMODIFIED', 'GIT_DELTA_ADDED',
  'GIT_DELTA_DELETED', 'GIT_DELTA_MODIFIED', 'GIT_DELTA_RENAMED',
  'GIT_DELTA_COPIED', 'GIT_DELTA_IGNORED', 'GIT_DELTA_UNTRACKED',
  'GIT_DELTA_TYPECHANGE'];

// git.raw.DiffList.lineOriginTypes.*
var GIT_LINE_ORIGINS = {
  ' ': 'GIT_DIFF_LINE_CONTEXT',
  '+': 'GIT_DIFF_LINE_ADDITION',
  '-': 'GIT_DIFF_LINE_DELETION',
  '\n': 'GIT_DIFF_LINE_ADD_EOFNL',
  '': 'GIT_DIFF_LINE_DEL_EOFNL',
  'F': 'GIT_DIFF_LINE_FILE_HDR',
  'H': 'GIT_DIFF_LINE_HUNK_HDR',
  'B': 'GIT_DIFF_LINE_BINARY',
};


var printRepo = exports.printRepo = function(repository_path, branch_name) {
  if (branch_name === undefined) branch_name = 'master';

  console.log('--- printRepo(%s, %s) ---', repository_path, branch_name);
  nodegit.Repo.open(repository_path, function(err, repo) {
    if (err) throw err;

    console.log('--- repo.getBranch(%s) ---', branch_name);
    repo.getBranch(branch_name, function(err, branch) {
      if (err) throw err;

      console.log('branch: ', branch);

      var history = branch.history();
      history.on('commit', function(commit) {
        var sig7 = commit.sha().slice(0, 7);
        var message = commit.message().slice(0, 64).replace(/\s+/g, ' ');
        var parent0 = commit.parentId(0);
        var parent0sig7 = parent0 ? parent0.sha().slice(0, 7) : 'none';

        console.log('Found commit(%s) < %s: %s', sig7, parent0sig7, message);
      }).start();

      console.log('%%$! after history.commit loop');

      // Iterate over the revision history.
      // head.oid(function(err, oid) {
      //   var shas = [];
      //   new nodegit.revwalk(head.rawRepo).allocate(function(err, revwalk) {
      //     revwalk.walk(oid, function(err, index, git_commit, no_more) {
      //       if (git_commit) {
      //         git_commit.sha(function(err, sha) {
      //           shas.push(sha);
      //         });
      //       }
      //       else {
      //         console.log(shas.length + ' commit(s)');
      //         loadShas(repo, shas);
      //       }
      //     });
      //   });
      // });
    });
  });
};

var listRepo = exports.listRepo = function(repository_path) {
  var gitdir = path.join(repository_path, '.git');
  nodegit.Repo.open(gitdir, function(err, repo) {
    if (err) throw err;

    repo.getMaster(function(err, branch) {
      if (err) throw err;

      branch.getTree(function(err, tree) {
        if (err) throw err;

        // `walk()` returns an eventemitter
        var walker = tree.walk();
        walker.on('entry', function(entry) {
          console.log(entry.path());
        });

        // Don't forget to call `start()`!
        walker.start();
      });
    });
  });
};

var loadShas = exports.loadShas = function(repo, shas) {
  // shas go from oldest to most recent
  // console.log(commits.length + ' commits');
  async.eachLimit(shas, 3, function(sha, callback) {
    // sha.cache = {};
    // logger.maybeError(err);
    console.log('--- commit: ' + sha + ' ---');
      // var local_commit = new Commit(repository_path, sha);
      // commits.push(local_commit);
    // });
    repo.commit(sha, function(err, commit) {
      commit.parentsDiffTrees(function(err, diffLists) {
        logger.maybeError(err);
        console.log('--- ' + diffLists.length + ' diffList(s) ---');
        // async.map(diffLists, function(diffList, callback) {
        var diffList = diffLists[0];
        // var summarized_deltas = [];
        var all_fileDeltas = [];

        diffList.rawDiffList.walk(function(err, fileDeltas) {
          logger.maybeError(err);
          fileDeltas.forEach(function(fileDelta) {
            all_fileDeltas.push(fileDelta);
          });
        }, function hunkCallback(err, diffHunk) {
          logger.maybeError(err);
          console.log('hunkCallback', err, diffHunk);
        }, function lineCallback(err, diffLine) {
          logger.maybeError(err);
          console.log('lineCallback', err, diffLine);
        }, function endCallback(err) {
          logger.maybeError(err);
          console.log('all_fileDeltas: ' + all_fileDeltas.length);
          callback(err, all_fileDeltas);
          // event.emit('end', error ? new git.error(error.message, error.code) : null, );
        });

        // diffList.walk().on('delta', function(err, git_delta) {
        //   if (err) callback(err);
        //   var delta = summarizeDelta(git_delta);
        //   deltas.push(delta);
        // }).on('end', function() {
        //   callback(null, deltas);
        // });
        // }, function(err, all_deltas) {
          // self.deltas = Array.prototype.concat.apply([], all_deltas);
          // callback(err, self.deltas);
        // });
      });
    });

    // callback();
    // });
    // .on('end', function(err) {
    //   logger.maybeError(err);
    // });

    // commit.fetchDetails(function(err) {
    //   console.log('--- ' + commit.parents + ' parent(s) ---');
    //   logger.maybeError(err);


      // summarizeCommit(commit, function(err, results) {
      // console.log('--- commit: ' + sha + ' ---');

      // function(callback, payload) {
        // console.log('payload', payload.parents);
      // if (commit.parents) {
      //   // console.log(err, diffLists);
      //   // callback(err);
      //   commit.fetchDeltas(function(err, deltas) {
      //     logger.maybeError(err);
      //     inspect(commit);
      //     inspect(deltas);
      //     callback(err);
      //   });
      // }
      // else {
      //   console.log('Skipping.');
      //   callback(err);
      // }
    // });
  }, function(err) {
    logger.maybeError(err);
    console.log('Done. ' + shas.length);
    // inspect(messages);
  });
};

// git.Repo.clone(uri, function(err, repo) {
//   if (err) throw err;

//   console.log('Cloned ' + uri + ' to ' + repo.path);

//   // inspect(repo);
//   repo.log(function(err) {
//     // var args = Array.prototype.slice.call(arguments, 0);
//     console.log('repo.log done');
//   });
// });

//   console.log('--- commit: ' + sha + ' ---');
//     // var local_commit = new Commit(repository_path, sha);
//     // commits.push(local_commit);
//   // });
//   callback();

// git_commits.push(commit);

// function User(opts) {
//   _.extend(this, opts);
// }
// User.fromGit = function(git_user, callback) {
//   async.auto({
//     name: git_user.name.bind(git_user),
//     email: git_user.email.bind(git_user)
//   }, function(err, payload) {
//     callback(err, new User(payload));
//   });
// };

// function Commit(repository_path, sha) {
//   this.repository_path = repository_path;
//   this.sha = sha;
//   // String sha
//   // Date date
//   // Number time
//   // String message
//   // User author
//   // User committer
//   // Number parents <- just the number of parents
// }
// Commit.prototype.fetchDetails = function(callback) {
//   var self = this;
//   git.repo(this.repository_path, function(err, git_repo) {
//     git_repo.commit(self.sha, function(err, git_commit) {
//       if (git_commit === undefined)
//         throw new Error('commit undefined ' + self.sha);
//       async.auto({
//         date: git_commit.date.bind(git_commit),
//         time: git_commit.time.bind(git_commit),
//         message: git_commit.message.bind(git_commit),
//         author: function(callback, payload) {
//           git_commit.author(function(err, git_user) {
//             User.fromGit(git_user, callback);
//           });
//         },
//         committer: function(callback, payload) {
//           git_commit.committer(function(err, git_user) {
//             User.fromGit(git_user, callback);
//           });
//         },
//         parents: function(callback) {
//           git_commit.parents(function(err, parents) {
//             callback(err, parents.length);
//           });
//         },
//       }, function(err, payload) {
//         _.extend(self, payload);
//         callback(err);
//       });
//     });
//   });
// };
// Commit.prototype.fetchDeltas = function(callback) {
//   // callback signature: function(err, deltas)
//   var self = this;
//   // get a new repo, just in case that was the memory issue
//   git.repo(this.repository_path, function(err, git_repo) {
//     // find the commit by sha (don't need
//     git_repo.commit(self.sha, function(err, git_commit) {
//       git_commit.parentsDiffTrees(function(err, diffLists) {
//         logger.maybeError(err);
//         console.log('--- ' + diffLists.length + ' diffList(s) ---');
//         // async.map(diffLists, function(diffList, callback) {
//         var diffList = diffLists[0];
//           var deltas = [];
//           diffList.walk().on('delta', function(err, git_delta) {
//             if (err) callback(err);
//             var delta = summarizeDelta(git_delta);
//             deltas.push(delta);
//           }).on('end', function() {
//             callback(null, deltas);
//           });
//         // }, function(err, all_deltas) {
//           // self.deltas = Array.prototype.concat.apply([], all_deltas);
//           // callback(err, self.deltas);
//         // });
//       });
//     });
//   });
// };

// function summarizeDelta(git_delta) {
//   var lines = {};
//   var chars = {};
//   git_delta.content.forEach(function(content) {
//     lines[content.lineOrigin] = (lines[content.lineOrigin] || 0) + 1;
//     chars[content.lineOrigin] = (chars[content.lineOrigin] || 0) + content.contentLength;
//   });
//   return {
//     oldFile: git_delta.oldFile,
//     newFile: git_delta.newFile,
//     status: git_delta.status,
//     status_type: GIT_DELTA_TYPES[git_delta.status],
//     lines: lines,
//     chars: chars,
//   };
// }

//! file: commit.file.bind(commit, 'inference.js'),
// parents: function(callback) {
//   commit.parents(function(err, parents) {
//     callback(null, parents.length);
//     // async.map(parents, function(commit, callback) {
//     //   // console.log('parent', commit);
//     //   commit.sha(callback);
//     // }, callback);
//   });
// },
// parentsDiffTrees: function(callback) {
//   commit.parentsDiffTrees(function(err, diffLists) {
//     logger.maybeError(err);
//     summarizeDiffTrees(diffLists, callback);
//   });
// },
