aXe Report Plugin
====================

This package is a derivation of the [protractor-accessibility-plugin](https://github.com/angular/protractor-accessibility-plugin). The protractor-accessibility-plugin can generate three different types of accessibility report from the last page that was loaded by the webdriver at the end of the test.

This plugin only uses the aXe Accessibility Engine, and can generate accessibility reports from any point during the test run. Key features:

*  Make a call to `runAxeTest(testName, url, driver)` once the webdriver has loaded the page under test, and you will get a report for that page. Example:


```js
it('Check accessibility', function() {
	runAxeTest('Signin page', browser.getCurrentUrl(), browser.driver);
});
```

Output:

```
 Test: Signin page
 URL:  http://localhost:9000/#/signin
       13 passes  and 1 violation
 Pass: Required ARIA attributes must be provided 
 Pass: Certain ARIA roles must contain particular children 
 Pass: Certain ARIA roles must be contained by particular parents 
 Pass: ARIA roles used must conform to valid values 
```

* You can also use `runAxeTestWithSelector(testName, url, driver, selector)` specify the CSS selector to use to get just a part of the page (handy for testing modal dialogs):

```js
  it('myDetails click', function() {
    mainPage.profileMenu.click();
    mainPage.myDetails.click();
    expect(mainPage.modalDialog.isDisplayed()).toBe(true);
    expect(element(by.id('healthcareProfessionalDetailsForm')).isDisplayed()).toBe(true);

    runAxeTestWithSelector('Clinician details', browser.getCurrentUrl(), browser.driver, '.modal-dialog');
  });
```

* The plugin also consolidates all the passes and violations together and groups them by standard, so you can see which standards pass and have violations:

```
--- Accessibilty test results by standard ---

 Standard: wcag2a
 Pass: Required ARIA attributes must be provided (1 pass, 0 fail)
 Pass: Certain ARIA roles must contain particular children (1 pass, 0 fail)
 Pass: Certain ARIA roles must be contained by particular parents (1 pass, 0 fail)
 Pass: ARIA roles used must conform to valid values (1 pass, 0 fail)
 Pass: Buttons must have discernible text (1 pass, 0 fail)
 Pass: Page must have means to bypass repeated blocks (1 pass, 0 fail)
 Pass: Documents must have <title> element to aid in navigation (1 pass, 0 fail)
 Pass: id attribute value must be unique (1 pass, 0 fail)
 Pass: Headings must not be empty (1 pass, 0 fail)
 Pass: <html> element must have a valid lang attribute (1 pass, 0 fail)
 Pass: Form elements must have labels (1 pass, 0 fail)
 Pass: Links must have discernible text (1 pass, 0 fail)

 Standard: wcag2aa
 Pass: Elements must have sufficient color contrast (1 pass, 0 fail)
 Fail: Zooming and scaling must not be disabled (0 pass, 1 fail)
```

* And finally, you can specify which standards you want to report on, and it will hide any issues (passes or violations) related to standards which are not specified. For instance, if I specify `standardsToReport: ['wcag2aa']` in the plugin config, I would get an output like this:

```
--- Accessibilty test results by standard ---
Only returning results for the following standards: wcag2aa

 Standard: wcag2aa
 Pass: Elements must have sufficient color contrast (1 pass, 0 fail)
 Fail: Zooming and scaling must not be disabled (0 pass, 1 fail)

--- Accessibilty test results by page ---
Only returning results for the following standards: wcag2aa

 Test: Signin page
 URL:  http://localhost:9000/#/signin
       1 pass  and 1 violation
 Pass: Elements must have sufficient color contrast 
 Fail: Zooming and scaling must not be disabled 
```

This makes it easy to focus on just the standard that you are working on at that time. 

# Installation
```
sudo npm install -g protractor-axe-report-plugin
```

Enable this plugin in your config file:

```js
    exports.config = {
	    ...
	    plugins: [{
	        displayHelpUrl: true|false,
	        displayContext: true|false,
	        displayPasses: true|false,
	        displayViolations: true|false,
	        standardsToReport: ['wcag2a', 'wcag2aa']
	        package: 'protractor-axe-report-plugin',
	    }]
	}
```

# To do
It would be great to make the test run return a non-zero exit code if the accessibility report flagged any violations - this way you could (eg) configure it to report on `wcag2a` and `wcag2aa`, and run it as part of your CI tests - any issues would be flagged immediately. If you can make this happen, pleasre raise a PR and i'll be your friend forever! :-)

Also, this is my first NPM package so please be gentle with me! If you've got any feedback about how I can make it better please let me know - thanks.
