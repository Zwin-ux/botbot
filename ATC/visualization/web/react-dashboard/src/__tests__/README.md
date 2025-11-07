# Dashboard Integration Tests

This directory contains comprehensive integration tests for the AI Controller Training Dashboard.

## Test Structure

### WebSocketService Tests (`services/__tests__/WebSocketService.test.ts`)
Tests WebSocket communication and real-time data updates:
- Connection management (connect, disconnect, reconnect)
- Message handling and routing
- Message sending (training commands, scenario commands, subscriptions)
- Real-time data flow and message ordering
- Error handling and resilience

### TrainingControls Tests (`components/__tests__/TrainingControls.test.tsx`)
Tests training control functionality and scenario switching:
- Training control buttons (start, pause, stop)
- Scenario selection and switching
- Training progress display
- Configuration dialog
- State transitions
- Button enable/disable logic

### App Integration Tests (`__tests__/App.integration.test.tsx`)
Tests dashboard responsiveness and component integration:
- Dashboard initialization
- Connection state management
- Real-time data updates across components
- Component data flow
- Performance and memory management
- Error handling

### E2E Dashboard Tests (`__tests__/Dashboard.e2e.test.tsx`)
Tests complete user workflows and cross-browser compatibility:
- Complete training workflows (start to finish)
- Real-time data streaming
- Connection resilience and recovery
- User interaction workflows
- Dashboard responsiveness
- Error scenarios

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test WebSocketService.test.ts
```

### Run tests matching pattern
```bash
npm test -- --testNamePattern="Connection Management"
```

## Test Coverage

The integration tests cover:

### Requirements Coverage
- **Requirement 4.1**: WebSocket communication and real-time data streaming
- **Requirement 4.2**: Training control interface functionality
- **Requirement 4.3**: Dashboard responsiveness and real-time updates

### Functional Coverage
- ✅ WebSocket connection establishment and management
- ✅ Real-time message routing and handling
- ✅ Training control commands (start, pause, stop)
- ✅ Scenario selection and switching
- ✅ Configuration management
- ✅ Data flow between components
- ✅ Connection loss and recovery
- ✅ Error handling and graceful degradation
- ✅ Memory management (data limits)
- ✅ Rapid data update handling
- ✅ State management across re-renders

### Browser Compatibility
Tests are designed to work across:
- Chrome/Chromium
- Firefox
- Safari
- Edge

## Test Utilities

### Mock WebSocket
A mock WebSocket implementation is provided in `setupTests.ts` for testing WebSocket functionality without a real server.

### Mock Components
Child components are mocked in integration tests to focus on data flow and integration points.

### Test Helpers
- `act()`: Wraps state updates for proper React testing
- `waitFor()`: Waits for async operations to complete
- `fireEvent`: Simulates user interactions
- `screen`: Queries for elements in the rendered output

## Writing New Tests

When adding new tests:

1. **Focus on integration**: Test how components work together, not implementation details
2. **Test user workflows**: Simulate real user interactions
3. **Test error scenarios**: Ensure graceful error handling
4. **Test performance**: Verify the dashboard handles rapid updates
5. **Mock external dependencies**: Use mocks for WebSocket and external services
6. **Use descriptive test names**: Clearly describe what is being tested

### Example Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  test('should do something specific', async () => {
    // Arrange
    render(<Component />);

    // Act
    fireEvent.click(screen.getByText('Button'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });
});
```

## Debugging Tests

### View test output
```bash
npm test -- --verbose
```

### Debug specific test
```bash
npm test -- --testNamePattern="test name" --verbose
```

### Check test coverage
```bash
npm test -- --coverage --coverageReporters=html
```
Then open `coverage/index.html` in a browser.

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- Fast execution (< 30 seconds for full suite)
- No external dependencies required
- Deterministic results
- Clear failure messages

## Known Limitations

1. **Canvas rendering**: Chart components are mocked as they require canvas support
2. **Animations**: Framer Motion animations are mocked to avoid timing issues
3. **WebSocket**: Uses mock implementation, not real WebSocket server
4. **Browser APIs**: Some browser APIs (IntersectionObserver, ResizeObserver) are mocked

## Troubleshooting

### Tests fail with "Cannot find module"
Run `npm install` to ensure all dependencies are installed.

### Tests timeout
Increase timeout in jest configuration or use `waitFor` with longer timeout:
```typescript
await waitFor(() => {
  expect(element).toBeInTheDocument();
}, { timeout: 5000 });
```

### Mock not working
Ensure mocks are defined before imports:
```typescript
jest.mock('../module');
// Then import components
```

### State updates not reflected
Wrap state updates in `act()`:
```typescript
act(() => {
  // State update code
});
```
