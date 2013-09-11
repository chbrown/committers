'use strict'; /*jslint es5: true, node: true, indent: 2 */
var mongoose = require('mongoose');
var db = mongoose.createConnection('localhost', 'committers');

var user_schema = new mongoose.Schema({
  id: Number,
  login: String,
  email: String,
  location: String,
  company: String,
  blog: String,
  type: {
    type: String,
    enum: ['User', 'Organization']
  },

  public_repos: Number,
  public_gists: Number,
  created_at: Date,
  updated_at: Date,
  following: Number,
  followers: Number,

  // created: {type: Date, 'default': Date.now},
  repositories: [],
});

var repo_schema = new mongoose.Schema({
  name: String,
});

var issue_schema = new mongoose.Schema({
  name: String,
});

exports.User = db.model('User', user_schema);
exports.Repo = db.model('Repo', repo_schema);
exports.Issue = db.model('Issue', issue_schema);
