var AxeBuilder = require('axe-webdriverjs');

/**
 * When testing your website agains the aXe plugin, you can generate different things in the report
 * enabling this plugin in your config file:
 *
 *    exports.config = {
 *      ...
 *      plugins: [{
 *        displayHelpUrl: true|false,
 *        displayContext: true|false,
 *        displayPasses: true|false,
 *        displayViolations: true|false,
 *        standardsToReport: ['wcag2a', 'wcag2aa'],
 *        package: 'protractor-axe-report-plugin',
 *      }]
 *    }
 *
 */

// Runs axe test against the current page loaded by the webdriver
// Global method, accessible from tests. 
runAxeTest = function(testName, driver) {
  AxeBuilder(driver)
    .analyze(function (results) {
      addResults(testName, '', results);
    });
}

// Runs axe test against the selector on the current page loaded by the webdriver, 
// Global method, accessible from tests. 
runAxeTestWithSelector = function(testName, driver, selector) {
  AxeBuilder(driver)
    .include(selector)
    .analyze(function (results) {
      addResults(testName, '', results);
    });
}

var allTestResults = [];
var resultsByTag = {};

const green = '\x1b[32m';
const red = '\x1b[31m';
const grey = '\x1b[37m';
const normalColor = '\x1b[39m';
const indent = '       ';


function addResults(testName, url, results) {
  allTestResults.push({name: testName, url: url, axeResults: results});
}

function displayViolation(result, displayHelpUrl, displayContext) {
  var label = result.nodes.length === 1 ? ' element ' : ' elements ';

  console.log(red, 'Fail:', result.help, normalColor);
  
  if(displayHelpUrl) {
    console.log(grey, '     ', result.helpUrl, normalColor);
  }

  if(displayContext) {
    var msg = result.nodes.reduce(function(msg, node) {
      return msg + indent + node.html + '\n\n';
    }, '\n');
    msg = '\n' + grey + indent + result.nodes.length + label + 'failed:' + '\n' + msg + normalColor;

    console.log(msg);
  }
}

function displayPass(result) {
  console.log(green,'Pass:', result.help, normalColor);
}

function getDefault(parameter, defaultValue) {
  if(parameter == null) {
    return defaultValue;
  }
  else {
    return parameter;
  }
}

function addToResultsByTag(result, resultsByTag, resultType) {
  if(resultType !== 'pass' && resultType !== 'violation') {
    throw new Error('resultType must be "pass" or "violation". We got "' + resultType + '"');
  }

  result.tags.forEach(function(tag) {
    if(resultsByTag[tag] == null) {
      resultsByTag[tag] = {};
    }

    if(resultsByTag[tag][result.id] == null) {
      resultsByTag[tag][result.id] = {};
      resultsByTag[tag][result.id]['pass'] = 0;    
      resultsByTag[tag][result.id]['violation'] = 0;    
    }

    resultsByTag[tag][result.id][resultType]++;    
    resultsByTag[tag][result.id].help = result.help;
    resultsByTag[tag][result.id].description = result.description;
    resultsByTag[tag][result.id].helpUrl = result.helpUrl;
  });
}

function getSummaryString(numPasses, numViolations) {
  var passLabel = numPasses === 1 ? ' pass ' : ' passes ';
  var violationLabel = numViolations === 1 ? ' violation' : ' violations';

  return numPasses + passLabel + ' and ' + numViolations + violationLabel;
}

function isStandardReportable(reportedStandard, standardsToReport) {

  // If we haven't specified any standards, report on them all
  if(standardsToReport.length === 0) {
    return true;
  }

  return standardsToReport.some(function(standardToReport) {
    return standardToReport === reportedStandard;
  })
}

function areAnyStandardsReportable(reportedStandards, standardsToReport) {
  // If nothing has been specified in standardsToReport, then check if we want to report on the current result

  // If we haven't specified any standards, report on them all
  if(standardsToReport.length === 0) {
    return true;
  }

  return reportedStandards.some(function(reportedStandard) { 
    return isStandardReportable(reportedStandard, standardsToReport);
  })
}

function filterTestResultsByStandard(testResults, standardsToReport)
{
  testResults.forEach(function(result) {

    // FIrst, remove issues which are tagged with standards that we don't want to report on
    result.axeResults.passes = result.axeResults.passes.filter(function(axeResult) {
      return areAnyStandardsReportable(axeResult.tags, standardsToReport);
    });

    result.axeResults.violations = result.axeResults.violations.filter(function(axeResult) {
      return areAnyStandardsReportable(axeResult.tags, standardsToReport);
    });

    // Next, fromt he remaining issues, remove any references to tags which we don't want to report on
    result.axeResults.passes.forEach(function(axeResult) {
      axeResult.tags = axeResult.tags.filter(function(tag) {
        return isStandardReportable(tag, standardsToReport);
      })
    })

    result.axeResults.violations.forEach(function(axeResult) {
      axeResult.tags = axeResult.tags.filter(function(tag) {
        return isStandardReportable(tag, standardsToReport);
      })
    })
  })
}

function reportStandardsMessage(standardsToReport) {
    // If we haven't specified any standards, report on them all
  if(standardsToReport == null || standardsToReport.length === 0) {
    console.log("No filters specified - reporting on all standards");
  }
  else {
    console.log("Only returning results for the following standards: " + standardsToReport);
  }
}

function displayResultsByStandard(pluginConfig) {
  // Now log out our overall maps of passes and violations. 
  console.log("--- Accessibilty test results by standard ---");
  reportStandardsMessage(pluginConfig.standardsToReport);

  // Keep track of whether any check has failed
  var anyFailure = false;

  allTestResults.forEach(function(testResult) {

    // Build up a map of all passes and failures, grouped by id
    testResult.axeResults.passes.forEach(function(result) {
      addToResultsByTag(result, resultsByTag, 'pass');
    });

    testResult.axeResults.violations.forEach(function(result) {
      addToResultsByTag(result, resultsByTag, 'violation');
    });
  });  

  var tag;

  for (tag in resultsByTag) {
    if (resultsByTag.hasOwnProperty(tag)) {
      console.log("");
      console.log(normalColor,"Standard:", tag);

      var id;

      for (id in resultsByTag[tag]) {
        if (resultsByTag[tag].hasOwnProperty(id)) {
          var didThisTestFail = resultsByTag[tag][id].violation > 0;
          anyFailure = anyFailure | didThisTestFail;

          var resultColor = didThisTestFail ? red : green;
          var header = didThisTestFail > 0 ? 'Fail: ' : 'Pass: '
          console.log(' ' + resultColor + header + resultsByTag[tag][id].help + ' (' + resultsByTag[tag][id].pass + ' pass, ' + resultsByTag[tag][id].violation + ' fail)' + normalColor);
        }
      }
    }
  }

  return anyFailure;
}

function displayResultsByPage(pluginConfig) {
  console.log("");
  console.log("--- Accessibilty test results by page ---");
  reportStandardsMessage(pluginConfig.standardsToReport);

  allTestResults.forEach(function(testResult) {
      console.log("");
      console.log(normalColor,"Test:", testResult.name);
      console.log(normalColor,"     ", getSummaryString(testResult.axeResults.passes.length, testResult.axeResults.violations.length));

      if(pluginConfig.displayPasses) {
        testResult.axeResults.passes.forEach(function(result) {
          displayPass(result);
        });
      }

      if(pluginConfig.displayViolations) {
        testResult.axeResults.violations.forEach(function(result) {
          displayViolation(result, pluginConfig.displayHelpUrl, pluginConfig.displayContext);
        });
      }
    });
}

function displayResults() {
  var pluginConfig = this.config;

  // Set the default values for displaying results
  pluginConfig.displayHelpUrl = getDefault(pluginConfig.displayHelpUrl, true);
  pluginConfig.displayContext = getDefault(pluginConfig.displayContext, true);
  pluginConfig.displayPasses = getDefault(pluginConfig.displayPasses, true);
  pluginConfig.displayViolations = getDefault(pluginConfig.displayViolations, true);
  pluginConfig.standardsToReport = getDefault(pluginConfig.standardsToReport, []);

  filterTestResultsByStandard(allTestResults, pluginConfig.standardsToReport);
  var anyFailure = displayResultsByStandard(pluginConfig, allTestResults);
  displayResultsByPage(pluginConfig, allTestResults);

  // What do we return from this method to get protractor to exit with a non-zero status code? 
  // Throwing an exception doesn't work
  // if(anyFailure) {
  //   throw new Error("Failures were detected reporting against standards");
  // }
}

// Export
exports.postResults = displayResults;