import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { plainText } from "~/lib/text";
import { NoteBody } from "./note-body";

function render(body: string) {
  return renderToStaticMarkup(<NoteBody body={plainText(body)} />);
}

describe("NoteBody", () => {
  it("wraps a word longer than the card instead of letting it overflow", () => {
    const html = render(`See https://example.com/${"a".repeat(200)}`);

    expect(html).toContain("wrap-anywhere");
  });

  it("keeps the Student's line breaks", () => {
    expect(render("First\nSecond")).toContain("whitespace-pre-wrap");
  });

  it("shows Markdown and HTML as the characters the Student typed", () => {
    const html = render("**bold** <b>tag</b>");

    expect(html).toContain("**bold** &lt;b&gt;tag&lt;/b&gt;");
    expect(html).not.toContain("<strong>");
    expect(html).not.toContain("<b>");
  });
});
