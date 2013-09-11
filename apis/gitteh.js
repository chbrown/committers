'use strict'; /*jslint es5: true, node: true, indent: 2 */
var gitteh = require('gitteh');

var list = exports.list = function(uri) {
  // TODO: test if filepath is a URL
  gitteh.openRepository(uri, function(err, repository) {
    // var refs = repository.listReferences();
    console.log(repository);
    repository.references.forEach(function(ref) {
      console.log('reference', ref);
    });
    repository.submodules.forEach(function(submodule) {
      console.log('submodule', submodule);
    });
    repository.remotes.forEach(function(remote) {
      console.log('remote', remote);
    });

    repository.tree(function() {
      console.log(arguments);
    });
  });
};
