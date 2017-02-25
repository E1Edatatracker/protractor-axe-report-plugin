describe('check if accessibility plugin works on bad apps', function() {
  it('should have accessibility problems on markup', function() {
    browser.get('badMarkup.html');
    expect(true).toBe(true);

    console.log('fail log');
    runAxeTest('Failure page', browser.driver);
  });
});
