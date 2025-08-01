import { ExtensionConfiguration } from "../config/types";

interface SystemPromptParams {
  config: ExtensionConfiguration;
  vcsType: "git" | "svn";
}

export function generateFallbackCommitMessageSystemPrompt({
  config,
  vcsType,
}: SystemPromptParams) {
  const {
    base: { language },
    features: {
      commitMessage: { useRecentCommitsAsReference },
    },
  } = config;

  const steps = [
    "Analyze the CODE CHANGES thoroughly to understand what's been modified.",
    "Use the ORIGINAL CODE to understand the context of the CODE CHANGES. Use the line numbers to map the CODE CHANGES to the ORIGINAL CODE.",
    `Identify the purpose of the changes to answer the *why* for the commit messages${
      useRecentCommitsAsReference
        ? ", also considering the optionally provided RECENT USER COMMITS"
        : ""
    }.`,
  ];

  if (useRecentCommitsAsReference) {
    steps.push(
      "Review the provided RECENT REPOSITORY COMMITS to identify established commit message conventions. Focus on the format and style, ignoring commit-specific details like refs, tags, and authors."
    );
  }

  steps.push(
    `Generate a thoughtful and succinct commit message for the given CODE CHANGES. It MUST follow the the established writing conventions.`
  );
  steps.push(
    "Remove any meta information like issue references, tags, or author names from the commit message. The developer will add them."
  );
  steps.push(
    "Now only show your message, Do not provide any explanations or details"
  );

  const promptSteps = steps.map((step, i) => `${i + 1}. ${step}`).join("\n");

  const VCSUpper = vcsType.toUpperCase();
  return `You are an AI programming assistant, helping a software developer to come with the best ${VCSUpper} commit message for their code changes.
You excel in interpreting the purpose behind code changes to craft succinct, clear commit messages that adhere to the repository's guidelines.

# First, think step-by-step:
${promptSteps}`;
}
