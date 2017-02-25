#!/usr/bin/env node

var Executor = require('./test_util').Executor;

var executor = new Executor();

executor.addCommandlineTest(
    'node node_modules/protractor/bin/protractor spec/successConfig.js')
    .expectExitCode(0);

// This is the same test as the failure test, but we set the config not to fail on aXe result failure
executor.addCommandlineTest(
    'node node_modules/protractor/bin/protractor spec/noAxeResultsConfig.js')
    .expectExitCode(0);

executor.addCommandlineTest(
    'node node_modules/protractor/bin/protractor spec/failureConfig.js')
    .expectExitCode(1)
    .expectErrors([{
      message: 'aXe - check if accessibility plugin works on bad apps - should have accessibility problems on markup'
    }]);

executor.execute();
