# 🎬 GuitarTube Automated Testing Suite

Automated testing for your watch.js page using Playwright. This will catch regressions and save you hours of manual testing!

## 🚀 Quick Setup

### 1. Install Playwright
```bash
npm install -D @playwright/test
npx playwright install
```

### 2. Set Up Test User Credentials
Create a `.env.local` file in your project root:
```bash
# .env.local
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password
```

**Important**: Use a dedicated test user account that:
- Has an active subscription (roadie or hero plan)
- Has the test video favorited
- Has some existing caption data for testing

### 3. Run Tests
```bash
# Run all tests
npm run test

# Run tests in headed mode (see browser)
npm run test:headed

# Run specific test
npm run test -- --grep "Video Loading"

# Generate test report
npm run test:report
```

## 📋 Test Coverage

### ✅ Critical User Flows Tested:
1. **Video Loading Performance** - Measures load time, ensures < 10 seconds
2. **Video Flip/Rotate Control** - Tests video stays in place, no cropping
3. **Caption Controls Display** - Tests caption area opens, video resizes correctly
4. **Text Caption Edit Modal** - Tests modal opens, displays records, closes properly
5. **Chord Caption Edit Modal** - Tests chord modal functionality
6. **Responsive Design** - Tests desktop, tablet, mobile viewports

### 🖼️ Visual Regression Testing
- Takes screenshots at key states
- Compares against baseline images
- Alerts you to any visual changes
- Tests multiple screen sizes

### 🌐 Cross-Browser Testing
- Chrome (primary)
- Firefox
- Safari/WebKit
- Mobile Chrome
- Mobile Safari

## 📊 Test Results

After running tests, you'll get:
- **HTML Report** - Visual test results with screenshots
- **JSON Report** - Machine-readable results for CI/CD
- **Screenshots** - Visual proof of test states
- **Videos** - Recordings of failed tests for debugging

## 🔧 Customization

### Adding New Tests
1. Edit `tests/watch-page.spec.js`
2. Add new test cases following the existing pattern
3. Use descriptive names and console.log for progress tracking

### Updating Selectors
If your UI changes, update the selectors in the test file:
```javascript
// Look for elements by data-testid (recommended)
await page.click('[data-testid="flip-button"]')

// Or by text content
await page.click('button:has-text("Cancel")')

// Or by CSS class
await page.click('.control-strip button:first-child')
```

### Adjusting Thresholds
- **Load time**: Currently set to 10 seconds max
- **Visual diff**: Currently allows 20% difference
- **Timeouts**: 30 seconds for actions, 15 seconds for video loading

## 🚨 Troubleshooting

### Authentication Issues
- Verify test user credentials in `.env.local`
- Check that test user has proper subscription
- Ensure test video is favorited

### Selector Issues
- Use browser dev tools to inspect elements
- Add `data-testid` attributes for reliable selection
- Use `page.pause()` to debug interactively

### Visual Regression Issues
- Delete `test-results/` folder to reset baselines
- Adjust threshold in `playwright.config.js`
- Check for animation timing issues

## 📈 CI/CD Integration

### GitHub Actions Example:
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

### Vercel Integration:
- Tests run automatically on each deployment
- Failed tests block deployment
- Visual diffs show exactly what changed

## 🎯 Next Steps

1. **Run initial test suite** to establish baselines
2. **Add data-testid attributes** to critical UI elements for more reliable selection
3. **Set up CI/CD integration** to run tests on every deploy
4. **Expand test coverage** as you add new features

## 📞 Support

If tests fail after refactoring:
1. Check the HTML report for visual diffs
2. Review failed test videos
3. Update selectors if UI structure changed
4. Regenerate baselines if changes are intentional

**This testing suite will save you hours of manual testing and catch regressions instantly!** 🎉
