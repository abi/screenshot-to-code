import { downloadCode } from "./download";

describe("downloadCode", () => {
  let createElementSpy: jest.SpyInstance;
  let appendChildSpy: jest.SpyInstance;
  let removeChildSpy: jest.SpyInstance;
  let clickSpy: jest.Mock;
  let mockAnchor: HTMLAnchorElement;

  beforeEach(() => {
    clickSpy = jest.fn();
    mockAnchor = {
      href: "",
      download: "",
      click: clickSpy,
    } as unknown as HTMLAnchorElement;

    createElementSpy = jest
      .spyOn(document, "createElement")
      .mockReturnValue(mockAnchor);
    appendChildSpy = jest
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => mockAnchor);
    removeChildSpy = jest
      .spyOn(document.body, "removeChild")
      .mockImplementation(() => mockAnchor);
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it("creates a blob URL and triggers download", () => {
    const testCode = "<html><body>Hello World</body></html>";

    downloadCode(testCode);

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(mockAnchor.href).toBe("mock-url");
    expect(mockAnchor.download).toBe("index.html");
    expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("mock-url");
  });

  it("handles empty code string", () => {
    downloadCode("");

    expect(clickSpy).toHaveBeenCalled();
    expect(mockAnchor.download).toBe("index.html");
  });

  it("handles code with special characters", () => {
    const codeWithSpecialChars = '<html><body>Test & "quotes" <tag></body></html>';

    downloadCode(codeWithSpecialChars);

    expect(clickSpy).toHaveBeenCalled();
  });
});
