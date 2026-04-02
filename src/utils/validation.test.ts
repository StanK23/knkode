import { describe, expect, it } from "vitest";
import { isValidCwd, normalizeCwd } from "./validation";

describe("normalizeCwd", () => {
	it("normalizes Windows device-prefixed drive paths", () => {
		expect(normalizeCwd("\\\\?\\C:\\Users\\sfory\\knkode")).toBe("C:\\Users\\sfory\\knkode");
		expect(normalizeCwd("\\??\\C:\\Users\\sfory\\knkode")).toBe("C:\\Users\\sfory\\knkode");
	});

	it("normalizes Windows device-prefixed UNC paths", () => {
		expect(normalizeCwd("\\\\?\\UNC\\server\\share\\repo")).toBe("\\\\server\\share\\repo");
		expect(normalizeCwd("\\??\\UNC\\server\\share\\repo")).toBe("\\\\server\\share\\repo");
	});
});

describe("isValidCwd", () => {
	it("accepts normalized Windows device-prefixed absolute paths", () => {
		expect(isValidCwd("\\\\?\\C:\\Users\\sfory\\knkode")).toBe(true);
		expect(isValidCwd("\\??\\C:\\Users\\sfory\\knkode")).toBe(true);
	});

	it("accepts UNC paths", () => {
		expect(isValidCwd("\\\\server\\share\\repo")).toBe(true);
	});
});
