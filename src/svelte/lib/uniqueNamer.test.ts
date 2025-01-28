import { describe, it, expect } from "vitest";
import { Namer } from "./uniqueNamer";
import { names } from "./uniqueNamer";

describe("Namer", () => {
  it("should return predefined names for initial counts", () => {
    const namer = Namer();
    expect(namer.getName(0)).toBe(names[0]);
    expect(namer.getName(1)).toBe(names[1]);
    expect(namer.getName(2)).toBe(names[2]);
  });

  it("should generate unique names beyond predefined names", () => {
    const namer = Namer();
    const predefinedLength = names.length; // Length of predefined names array

    // Generate names up to the length of predefined names
    for (let i = 0; i < predefinedLength; i++) {
      namer.getName(i);
    }

    // Check the first generated name beyond predefined names
    const uniqueName = namer.getName(predefinedLength);
    expect(uniqueName).toBe(uniqueName[0] + uniqueName[0]);
  });

  it("should return the same name for the same uid", () => {
    const namer = Namer();
    const uid = "test-uid";
    const name1 = namer.getName(uid);
    const name3 = namer.getName("other-id");
    const name2 = namer.getName(uid);
    expect(name1).toBe(name2);
  });

  it("should return different names for different uids", () => {
    const namer = Namer();
    const uid1 = "test-uid-1";
    const uid2 = "test-uid-2";
    const name1 = namer.getName(uid1);
    const name2 = namer.getName(uid2);
    expect(name1).not.toBe(name2);
  });
});
