import {
  isStaleTempPreviewError,
  publishTempPreview,
  revokeTempPreview,
  TempPreviewConnection,
  TempPreviewError,
} from "./tempPreview";

const previous: TempPreviewConnection = {
  tempId: "temp-existing",
  canonicalUrl: "https://existing.temp.md",
  updateToken: "update-secret",
  expiresAt: "2026-08-31T00:00:00.000Z",
};

describe("publishTempPreview", () => {
  it("creates a preview from normalized HTML", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async (_url, init) => {
      const formData = init?.body as FormData;
      const file = formData.get("file") as File;
      expect(await file.text()).toContain("@babel/standalone@7.25.6");
      return Response.json(
        {
          tempId: "temp-new",
          canonicalUrl: "https://new-preview.temp.md",
          updateToken: "new-secret",
          expiresAt: "2026-08-31T00:00:00.000Z",
        },
        { status: 201 }
      );
    });

    const result = await publishTempPreview({
      html: '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>',
      fetcher,
      baseUrl: "https://api.example.test/",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/temps",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.canonicalUrl).toBe("https://new-preview.temp.md");
  });

  it("updates an existing preview and retains its scoped token", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () =>
      Response.json({
        tempId: previous.tempId,
        canonicalUrl: previous.canonicalUrl,
        versionId: "version-2",
        expiresAt: "2026-09-01T00:00:00.000Z",
      })
    );

    const result = await publishTempPreview({
      html: "<html><body>Updated</body></html>",
      previous,
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.temp.md/temps/temp-existing",
      expect.objectContaining({
        method: "PUT",
        headers: { Authorization: "Bearer update-secret" },
      })
    );
    expect(result.updateToken).toBe(previous.updateToken);
    expect(result.expiresAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("surfaces safe API error messages and stale capabilities", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () =>
      Response.json({ message: "This Temp is unavailable." }, { status: 410 })
    );

    const publish = publishTempPreview({
      html: "<html></html>",
      previous,
      fetcher,
    });

    await expect(publish).rejects.toMatchObject({
      message: "This Temp is unavailable.",
      status: 410,
    });
    await publish.catch((error) => {
      expect(isStaleTempPreviewError(error)).toBe(true);
    });
  });
});

describe("revokeTempPreview", () => {
  it("revokes with the stored capability", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () => new Response(null, { status: 204 }));

    await revokeTempPreview(previous, fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.temp.md/temps/temp-existing",
      {
        method: "DELETE",
        headers: { Authorization: "Bearer update-secret" },
      }
    );
  });

  it("marks authorization failures as typed errors", async () => {
    const fetcher = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () =>
      Response.json({ error: "Invalid update token" }, { status: 403 })
    );

    await expect(revokeTempPreview(previous, fetcher)).rejects.toBeInstanceOf(
      TempPreviewError
    );
  });
});
