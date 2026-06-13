import { describe, expect, it } from "vitest";

import { defineDomainError, defineReferenceGuardError } from "../src";

class _SampleBase extends defineDomainError("Sample", "sample-feature") {}
class SampleFeatureError extends _SampleBase {
  static hasReferences = defineReferenceGuardError({
    errorClass: SampleFeatureError,
    message: ({ id, count }) =>
      `紐づく参照が ${count} 件あるため Sample を削除できません (id: ${id})`,
    dataKey: "referenceCount",
  });
}

describe("defineReferenceGuardError", () => {
  it("creates a CONFLICT error instance of the given errorClass", () => {
    const err = SampleFeatureError.hasReferences({ id: "abc", count: 3 });

    expect(err).toBeInstanceOf(SampleFeatureError);
    expect(err.code).toBe("CONFLICT");
    expect(err.packageName).toBe("sample-feature");
    expect(err.message).toBe(
      "紐づく参照が 3 件あるため Sample を削除できません (id: abc)",
    );
  });

  it("places count under the configured dataKey on error.data", () => {
    const err = SampleFeatureError.hasReferences({ id: "x", count: 7 });
    expect(err.data).toEqual({ referenceCount: 7 });
  });

  it("preserves instanceof + name when extended via subclass", () => {
    const err = SampleFeatureError.hasReferences({ id: "y", count: 1 });
    expect(err.name).toBe("SampleFeatureError");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("defineDomainError", () => {
  it("provides shared factories that return subclass instances", () => {
    const err = SampleFeatureError.notFound("abc");
    expect(err).toBeInstanceOf(SampleFeatureError);
    expect(err.code).toBe("NOT_FOUND");
  });
});
