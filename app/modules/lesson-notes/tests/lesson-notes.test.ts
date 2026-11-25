import { describe, it, expect } from "vitest";
import { describeNoteDraft } from "../index";

const MAX = 10;

describe("describeNoteDraft", () => {
  it("is empty when nothing is saved and nothing is typed", () => {
    expect(
      describeNoteDraft({ savedBody: null, draft: "   ", maxLength: MAX })
    ).toEqual({ kind: "empty", canSave: false, charactersLeft: 10 });
  });

  it("is unsaved and can be saved once the Student types a first Note", () => {
    expect(
      describeNoteDraft({ savedBody: null, draft: "hello", maxLength: MAX })
    ).toEqual({ kind: "unsaved", canSave: true, charactersLeft: 5 });
  });

  it("is saved when the draft matches the saved Note", () => {
    expect(
      describeNoteDraft({ savedBody: "hello", draft: "hello", maxLength: MAX })
    ).toEqual({ kind: "saved", canSave: false, charactersLeft: 5 });
  });

  it("ignores surrounding whitespace, as the save action trims it", () => {
    expect(
      describeNoteDraft({
        savedBody: "hello",
        draft: "  hello\n",
        maxLength: MAX,
      })
    ).toEqual({ kind: "saved", canSave: false, charactersLeft: 5 });
  });

  it("is unsaved when the draft differs from the saved Note", () => {
    expect(
      describeNoteDraft({ savedBody: "hello", draft: "hello!", maxLength: MAX })
    ).toEqual({ kind: "unsaved", canSave: true, charactersLeft: 4 });
  });

  it("cannot be saved when the Student clears a saved Note", () => {
    expect(
      describeNoteDraft({ savedBody: "hello", draft: " ", maxLength: MAX })
    ).toEqual({ kind: "cleared", canSave: false, charactersLeft: 10 });
  });

  it("can be saved at exactly the limit", () => {
    expect(
      describeNoteDraft({
        savedBody: null,
        draft: "a".repeat(MAX),
        maxLength: MAX,
      })
    ).toEqual({ kind: "unsaved", canSave: true, charactersLeft: 0 });
  });

  it("cannot be saved one character over the limit", () => {
    expect(
      describeNoteDraft({
        savedBody: "a".repeat(MAX + 1),
        draft: "a".repeat(MAX + 1),
        maxLength: MAX,
      })
    ).toEqual({ kind: "too-long", canSave: false, charactersLeft: -1 });
  });
});
