import { describe, expect, it } from "vitest";
import * as exported from "../src/index";

describe("library exports", () => {
  it("exports all public entry points", () => {
    expect(exported.DateField).toBeTypeOf("function");
    expect(exported.NumericTextField).toBeTypeOf("function");
    expect(exported.SelectField).toBeTypeOf("function");
    expect(exported.StringTextField).toBeTypeOf("function");
    expect(exported.useDebounce).toBeTypeOf("function");
  });
});
