import { VariantStatus } from "../commits/types";
import {
  formatCompletedGenerationDuration,
  formatDurationBetween,
  formatDurationMs,
} from "./generation-time";

describe("generation time formatting", () => {
  test("uses the concise formatting shared by live and completed timers", () => {
    expect(formatDurationMs(0)).toBe("1s");
    expect(formatDurationMs(8_000)).toBe("8s");
    expect(formatDurationMs(115_000)).toBe("1m 55s");
    expect(formatDurationMs(3_660_000)).toBe("1h 1m");
  });

  test("formats elapsed wall-clock time only when both timestamps exist", () => {
    expect(formatDurationBetween(1_000, 116_000)).toBe("1m 55s");
    expect(formatDurationBetween(undefined, 116_000)).toBe("");
    expect(formatDurationBetween(1_000, undefined)).toBe("");
  });

  test.each<VariantStatus>(["complete", "error", "cancelled"])(
    "shows a stable completed duration for %s variants",
    (status) => {
      expect(
        formatCompletedGenerationDuration(status, 1_000, 116_000)
      ).toBe("1m 55s");
    }
  );

  test("does not turn a live generation into a completed duration", () => {
    expect(
      formatCompletedGenerationDuration("generating", 1_000, 116_000)
    ).toBe("");
  });
});
