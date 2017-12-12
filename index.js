var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var handlebars = require('handlebars');
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
 *        ignoreAxeFailures: true|false,
 *        package: 'protractor-axe-report-plugin',
 *        htmlReportPath: '/path/to/reports'|null
 *      }]
 *    }
 *
 */

const allTestResults = [];
const currentTestResults = [];
var browserName = '';

const green = '\x1b[32m';
const red = '\x1b[31m';
const grey = '\x1b[37m';
const normalColor = '\x1b[39m';
const indent = '  ';

function setup() {
  browser.runAxeTest = runAxeTest;
  browser.runAxeTestWithSelector = runAxeTestWithSelector;
}

function onPrepare() {
  var pluginConfig = this.config;

  pluginConfig.ignoreAxeFailures = getDefault(pluginConfig.ignoreAxeFailures, false);
  pluginConfig.displayHelpUrl = getDefault(pluginConfig.displayHelpUrl, true);
  pluginConfig.displayContext = getDefault(pluginConfig.displayContext, true);
  pluginConfig.displayPasses = getDefault(pluginConfig.displayPasses, true);
  pluginConfig.displayViolations = getDefault(pluginConfig.displayViolations, true);
  pluginConfig.standardsToReport = getDefault(pluginConfig.standardsToReport, []);
  pluginConfig.htmlReportPath = getDefault(pluginConfig.htmlReportPath, null);
}

function postTest(passed, testInfo) {
  const pluginConfig = this.config;
  const context = this;

  if (pluginConfig.ignoreAxeFailures) {
    return;
  }

  var testHeader = 'aXe - ';

  // Process the result to remove any standards that we are not interested in
  currentTestResults.forEach((result) => {
    filterTestResultByStandard(result, pluginConfig.standardsToReport);
  });

  // If we have > 0 violations, the test fails
  // If we have > 0 passes, log a pass
  // If we had 0 passes and 0 violations, we can't really say whether this test passed or failed, so say nothing.
  var passCount = 0;
  var violationCount = 0;

  currentTestResults.forEach((result) => {
    passCount += result.axeResults.passes.length;
    violationCount += result.axeResults.violations.length;
  });

  if (violationCount > 0) {
    // Ideally we'd just log the errorMessage as specName, but the test doesn't let us match by specName - just by error message
    var errorMessage = testHeader + testInfo.category + ' - ' + testInfo.name;
    context.addFailure(errorMessage, {specName: errorMessage});
  } else if (passCount > 0) {
    context.addSuccess({specName: testHeader + testInfo.category + ' - ' + testInfo.name});
  }

  // Clear out the current test results, ready for the next test
  currentTestResults = [];
}

function postResults() {
  logAllTestResults.bind(this)();
  saveReport.bind(this)();
}

function runAxeTest(testName) {
  return new Promise((resolve, reject) => {
    browser.driver.getCapabilities()
      .then((capabilities) => {
        browserName = capabilities.get('browserName');
        if (browserName === 'chrome' || browserName === 'firefox') {
          AxeBuilder(browser.driver)
            .analyze((results) => {
              addResults(testName, browserName, results);
              resolve(results);
            });
        } else {
          console.log(`Skipping aXe tests in unsupported browser (${browserName}).`);
          resolve();
        }
      });
  });
}

function runAxeTestWithSelector(testName, selector) {
  return new Promise((resolve, reject) => {
    browser.driver.getCapabilities()
      .then((capabilities) => {
        browserName = capabilities.get('browserName');
        if (browserName === 'chrome' || browserName === 'firefox') {
          AxeBuilder(browser.driver)
            .include(selector)
            .analyze(function (results) {
              addResults(testName, results);
              resolve(results);
            });
        } else {
          console.log(`Skipping aXe tests in unsupported browser (${browserName}).`);
          resolve();
        }
      });
  });
}

function mkdir(dir) {
  path.dirname(dir)
    .split(path.sep)
    .reduce((currentPath, pathSegment) => {
      currentPath += pathSegment + path.sep;
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath);
      }
      return currentPath;
    }, '');
}

function getDefault(parameter, defaultValue) {
  return parameter == null ? defaultValue : parameter;
}

function addResults(testName, browserName, results) {
  allTestResults.push({ name: testName, browser: browserName, axeResults: results });
  currentTestResults.push({ name: testName, browser: browserName, axeResults: results });
}

function filterRuleResultsByStandard(ruleResults, standards) {
  return ruleResults.reduce(
    (results, result) => {
      const isResultForStandard = standards.length > 0
        ? result.tags.some(Array.prototype.includes.bind(standards))
        : true;

      if (isResultForStandard) {
        // remove any references to standards that aren't specified
        if (standards.length > 0) {
          result.tags = result.tags.filter(Array.prototype.includes.bind(standards));
        }

        results.push(result);
      }

      return results;
    },
    []
  );
}

function filterTestResultByStandard(testResult, standards) {
  testResult.axeResults.passes = filterRuleResultsByStandard(testResult.axeResults.passes, standards);
  testResult.axeResults.violations = filterRuleResultsByStandard(testResult.axeResults.violations, standards);
  return testResult;
}

function getSummaryString(passesLength, violationsLength) {
  var passLabel = passesLength === 1 ? ' pass ' : ' passes ';
  var violationLabel = violationsLength === 1 ? ' violation' : ' violations';

  return passesLength + passLabel + ' and ' + violationsLength + violationLabel;
}

function logViolation(result, displayHelpUrl, displayContext) {
  var label = result.nodes.length === 1 ? ' element ' : ' elements ';

  console.log(red, 'Fail:', result.help, normalColor);

  if (displayHelpUrl) {
    console.log(grey + indent + result.helpUrl, normalColor);
  }

  if (displayContext) {
    var htmlTargets = result.nodes.reduce((msg, node) => msg + indent + node.html + '\n\n', '\n');
    var msg = grey + indent + result.nodes.length + label + 'failed:' + '\n';
    msg += htmlTargets + normalColor;

    console.log('');
    console.log(msg);
  }
}

function logPass(result) {
  console.log(green,'Pass:', result.help, normalColor);
}

function logStandardsMessage(standards) {
  if (standards == null || standards.length === 0) {
    console.log('No filters specified - reporting on all standards');
  } else {
    console.log('Only returning results for the following standards:', standards);
  }
}

function logAllTestResults() {
  const testResults = allTestResults.reduce(
    (results, testResult) => {
      testResult = filterTestResultByStandard(testResult, this.config.standardsToReport);

      if (testResult.axeResults.passes.length > 0 || testResult.axeResults.violations.length > 0) {
        results.push(testResult);
      }

      return results;
    },
    []
  );

  console.log('');
  console.log('--- Accessibilty test results by test ---');

  logStandardsMessage(this.config.standardsToReport);

  testResults.forEach((testResult) => {
    console.log('');
    console.log(normalColor, 'Test:', testResult.name);
    console.log(
      normalColor,
      indent,
      getSummaryString(testResult.axeResults.passes.length, testResult.axeResults.violations.length)
    );

    if (this.config.displayPasses) {
      testResult.axeResults.passes.forEach(logPass);
    }

    if (this.config.displayViolations) {
      testResult.axeResults.violations.forEach((result) => {
        logViolation(result, this.config.displayHelpUrl, this.config.displayContext);
      });
    }
  });
}

function saveReport() {
  if (this.config.htmlReportPath === null) {
    return;
  }

  const htmlTemplateFilename = path.resolve(__dirname, 'report.hbs');
  const htmlReportFilename = path.resolve(process.cwd(), this.config.htmlReportPath, `a11y-${browserName}.html`);

  const impactSortWeight = [
    'minor',
    'moderate',
    'serious',
    'critical'
  ];

  const ruleResultsSortCompare = function(a, b) {
    if (a === b) {
      return 0;
    }

    const aIndex = impactSortWeight.indexOf(a.impact);
    const bIndex = impactSortWeight.indexOf(b.impact);

    return aIndex < bIndex ? 1 : -1;
  };

  const testResults = allTestResults.reduce(
    (results, testResult) => {
      testResult = filterTestResultByStandard(testResult, this.config.standardsToReport);

      testResult.axeResults.passes.sort(ruleResultsSortCompare);
      testResult.axeResults.violations.sort(ruleResultsSortCompare);

      if (testResult.axeResults.passes.length > 0 || testResult.axeResults.violations.length > 0) {
        results.push(testResult);
      }

      return results;
    },
    []
  );

  if (testResults.length === 0) {
    return;
  }

  let templateContent;

  try {
    templateContent = fs.readFileSync(htmlTemplateFilename, 'utf-8');
  } catch (e) {
    throw new Error(`Something went wrong while trying to load htmlTemplateFilename from ${htmlTemplateFilename} (${e.message})!`);
  }

  handlebars.registerHelper('link', function(text, url) {
    text = handlebars.Utils.escapeExpression(text);
    url = handlebars.Utils.escapeExpression(url);

    var result = `<a href="${url}" target="_blank">${text}</a>`;

    return new handlebars.SafeString(result);
  });

  handlebars.registerHelper('startCase', function(value) {
    return _.startCase(value);
  });

  handlebars.registerHelper('commaDelimitedList', function(value) {
    return value.join(', ');
  });

  const template = handlebars.compile(templateContent);
  const html = template({
    testResults,
    browserName,
    displayViolations: this.config.displayViolations,
    displayPasses: this.config.displayPasses
  });

  try {
    mkdir(htmlReportFilename);
    fs.writeFileSync(htmlReportFilename, html, 'utf-8');
  } catch (e) {
    throw new Error(`Something went wrong while trying to write htmlReportFilename to ${htmlReportFilename} (${e.message})!`);
  }
}

exports.setup = setup;
exports.onPrepare = onPrepare;
exports.postTest = postTest;
exports.postResults = postResults;
exports.runAxeTest = runAxeTest;
exports.runAxeTestWithSelector = runAxeTestWithSelector;
