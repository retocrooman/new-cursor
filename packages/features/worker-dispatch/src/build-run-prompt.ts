function appendRulesSection(
  sections: string[],
  heading: string,
  contents: string[],
): void {
  if (contents.length === 0) {
    return;
  }

  sections.push(heading, "");
  for (const content of contents) {
    sections.push(content, "");
  }
}

export function buildRunPrompt(input: {
  title: string;
  branchName: string;
  rules?: {
    all?: string[];
    agent?: string[];
  };
}): string {
  const sections: string[] = [];

  appendRulesSection(sections, "# Rules (all)", input.rules?.all ?? []);
  appendRulesSection(sections, "# Rules (agent)", input.rules?.agent ?? []);

  sections.push(
    "# Task",
    "",
    `Title: ${input.title}`,
    `Branch: ${input.branchName}`,
    "",
    "## Verification",
    "",
    "- [ ] Add verification steps here",
  );

  return sections.join("\n");
}
