export function buildRunPrompt(input: {
  title: string;
  branchName: string;
}): string {
  return [
    "# Task",
    "",
    `Title: ${input.title}`,
    `Branch: ${input.branchName}`,
    "",
    "## Verification",
    "",
    "- [ ] Add verification steps here",
  ].join("\n");
}
