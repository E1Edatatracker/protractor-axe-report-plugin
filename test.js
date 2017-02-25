#!/usr/bin/env node

var Executor = require('./test_util').Executor;

var passingTests = [
  'node node_modules/protractor/bin/protractor spec/successConfig.js',
];

var executor = new Executor();

passingTests.forEach(function(passing_test) {
  executor.addCommandlineTest(passing_test)
    .expectExitCode(0);
});

/*************************
 *Below are failure tests*
 *************************/

executor.addCommandlineTest(
    'node node_modules/protractor/bin/protractor spec/failureConfig.js')
    .expectExitCode(0)
    .expectErrors([{
      message: '3 elements failed:'
    },
    {
      message: '1 element failed:'
    },
    {
      message: '1 element failed:'
    },
    {
      message: '3 elements failed:'
    },
    {
      message: '1 element failed:'
    },
    {
      message: '1 element failed:'
    }]);

executor.execute();
