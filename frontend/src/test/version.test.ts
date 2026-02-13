import { describe, it, expect } from "vitest";
import pkg from "../../package.json";

describe("Version Consistency", () => {
    it("should have version 1.0.0", () => {
        expect(pkg.version).toBe("1.0.0");
    });

    it("should match naming conventions", () => {
        expect(pkg.name).toBe("ryze-frontend");
    });
});
