/**
 * Basic Test Suite
 * Simple tests to verify Jest configuration is working
 */

describe("Basic Test Suite", () => {
  test("should run basic test", () => {
    expect(1 + 1).toBe(2);
  });

  test("should handle async operations", async () => {
    const result = await Promise.resolve("test");
    expect(result).toBe("test");
  });

  test("should handle mocked functions", () => {
    const mockFn = jest.fn();
    mockFn("test");
    expect(mockFn).toHaveBeenCalledWith("test");
  });

  test("should verify environment", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });
});
