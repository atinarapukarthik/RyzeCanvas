import { describe, it, expect } from "vitest";
import pkg from "../../package.json";

describe("Version Consistency", () => {
    it("should have version 0.1.0", () => {
        expect(pkg.version).toBe("0.1.0");
    });

    it("should match naming conventions", () => {
        expect(pkg.name).toBe("frontend");
    });
});
