'use strict'; /*jslint es5: true, node: true, indent: 2 */
var _ = require('underscore');
var async = require('async');
var child_process = require('child_process');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var streaming = require('streaming');

var logger = require('loge');


function rm_rf(filepath, callback) {
  // callback signature: function(err)
  // assume it's a file
  fs.unlink(filepath, function(err) {
    if (err) {
      // no? must be a directory
      fs.readdir(filepath, function(err, files) {
        // rm_rf all the children
        async.each(files, function(file, callback) {
          rm_rf(file, callback);
        }, function(err) {
          if (err) throw err;
          // rmdir the directory (we hope it's a directory!)
          fs.rmdir(filepath, callback);
        });
      });
    }
  });
}

function spawn_git(args, opts, callback) {
  // stdio: [STDIN, STDOUT, STDERR]
  opts = _.extend({stdio: ['ignore', 'pipe', 'pipe']}, opts);
  var child = child_process.spawn('git', args, opts);
  if (callback) {
    child.on('error', function(err) {
      logger.error(err);
      if (callback) callback(err);
    })
    .on('close', function(code, signal) {
      if (callback) callback(null, code, signal);
    });
  }
  return child;
}

var Repo = exports.Repo = function(path) {
  this.path = path;
};
// Instance methods
Repo.prototype.spawn = function(args, callback) {
  var child = spawn_git(args, {cwd: this.path}, callback);

  // handle STDERR here (should be silent in production)
  child.stderr.on('data', function(data) {
    logger.error(data);
  }).setEncoding('utf8');

  // let the caller handle STDOUT
  return child;
};
Repo.prototype.remotes = function(callback) {
  // callback: function(err, [{name: 'origin', uri: 'git://...', type: 'fetch'}, ...])
  var remotes = [];
  var child = this.spawn(['remote', '--verbose'])
  .on('error', callback.bind(null))
  .on('close', function(code, signal) {
    callback(null, remotes);
  });

  child.stdout.pipe(new streaming.Splitter())
  .on('data', function(line) {
    var m = line.match(/(\w+)\t(\S+) \((\w+)\)/);
    remotes.push({name: m[1], uri: m[2], type: m[3]});
  });
};
Repo.prototype.pull = function(callback) {
  // callback: function(err)
  return this.spawn(['pull']).on('close', callback);
};
Repo.prototype.fetch = function(callback) {
  // callback: function(err)
  return this.spawn(['fetch']).on('close', callback);
};
Repo.prototype.log = function(callback) {
  // callback: function(err)
  var patterns = [
    ['%H', 'commit'],
    ['%an', 'author_name'],
    ['%ae', 'author_email'],
    ['%ai', 'author_date'],
    ['%cn', 'committer_name'],
    ['%ce', 'committer_email'],
    ['%ci', 'committer_date'],
    ['%s', 'subject'],
    ['%b', 'body'],
  ];
  var tformat = patterns.map(function(pair) {
    return pair[1] + '=' + pair[0];
  }).join('\t');
  var spawn_args = ['log', '--pretty=' + tformat, '--numstat', '--summary'];

  logger.debug('Using git-log args: ' + spawn_args.join(' '));

  var child = this.spawn(spawn_args).on('close', callback);

  var commits = [];
  var commit = null;

  var line_stream = child.stdout.pipe(new streaming.Splitter());

  line_stream.on('data', function(line) {
    var m, filename, file;
    if (line.match(/^commit=/)) {
      if (commit) {
        logger.info('commit', JSON.stringify(commit, null, '  '));

        commits.push(commit);
      }
      commit = {files: {}};
      // var commit_pairs =
      line.split(/\t/).forEach(function(pair) {
        var pair_parts = pair.split(/=/);
        commit[pair_parts[0]] = pair_parts.slice(1).join('=');
      });
    }
    else if ((m = line.match(/^ (create|delete) mode (\d+) (.+)/))) {
      // e.g., " delete mode 100644 tests/extended.js"
      filename = m[3];
      file = commit.files[filename] || {};
      file.action = m[1];
      file.mode = m[2];
      commit.files[filename] = file;
      // mode change 100755 => 100644 config/akka-default.conf
    }
    else if ((m = line.match(/^(-|\d+)\s+(-|\d+)\s+(.+)/))) {
      // e.g., "81  0 test.js"
      filename = m[3];
      file = commit.files[filename] || {};
      // git uses '-' to denote modifications to binary files.
      // parseInt('-', 10) gives NaN, so || -1 will give back -1 for those.
      file.added = parseInt(m[1], 10) || -1;
      file.deleted = parseInt(m[2], 10) || -1;
      commit.files[filename] = file;
    }
    // else if (line.match(/^\s*$/)) {
    //   // ignore blank lines
    // }
    else {
      commit.body += line;
      // logger.error('did not understand line: ', line);
    }
    // var parts = line.split(/\0/);

    // process.stdout.write('\n---------------------------');
    // process.stdout.write('\n#>  ' + parts[0]);
    // process.stdout.write('\n#2+ ' + parts.slice(1).join(','));
    // process.stdout.write(line.replace(/\0/g, 'Z'));
    // console.log(parts[0]);

    // var m = line.match(/(\w+)\t(\S+) \((\w+)\)/);
    // remotes.push({name: m[1], uri: m[2], type: m[3]});
  });

  return child;
};




// Static methods
Repo.clone = function(uri, opts, callback) { // i.e., ensureClone
  if (callback === undefined) {
    callback = opts;
    opts = {};
  }
  // opts: directory, name, path
  opts = _.extend({
    name: path.basename(uri, '.git'),
    directory: '/tmp/git',
    bare: true,
  }, opts);
  if (!opts.path) {
    opts.path = path.join(opts.directory, opts.name);
  }

  var repo = new Repo(opts.path);
  var _clone = function() {
    var args = ['clone', uri];
    if (opts.path) args.push(opts.path);
    if (opts.bare) args.push('--bare');

    spawn_git(args, {cwd: opts.directory, stdio: ['ignore', 'inherit', 'inherit']})
    .on('close', function(code, signal) {
      callback(null, repo);
    })
    .on('error', function(err) {
      callback(err);
    })
    .stdout.on('data', function(data) {
      logger.info(data);
    }).setEncoding('utf8');
  };

  mkdirp(opts.directory, function(err) {
    if (err) throw err;
    fs.exists(opts.path, function(exists) {

      if (exists) {
        logger.debug('Path already exists: ' + opts.path);
        // need to check that it's 1. a git repository and 2. has uri as one of its remotes
        repo.remotes(function(err, remotes) {
          if (err) throw err;
          var remote = _.findWhere(remotes, {uri: uri});
          logger.debug('Repository already contains remote.', remote);
          if (!remote) {
            logger.debug('Existing repo does not contain remote with uri: ' + uri);
            rm_rf(opts.path, function(err) {
              _clone();
            });
          }
          else {
            // 3. make sure it's up to date?
            repo.fetch(function(code, signal) {
              callback(null, repo);
            });
          }
        });
      }
      else {
        _clone();
      }
    });
  });
};
