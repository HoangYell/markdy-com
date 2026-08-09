import { getAgentReference, textHeaders } from "../lib/agent-reference";

export async function GET() {
  const reference = await getAgentReference();

  return new Response(reference.content, {
    headers: {
      ...textHeaders("text/markdown", reference.version),
      Link: [
        `<${reference.humanUrl}>; rel="alternate"; type="text/html"`,
        `<${reference.fullContextUrl}>; rel="alternate"; type="text/plain"`,
        `<${reference.githubUrl}>; rel="alternate"; type="text/markdown"`,
      ].join(", "),
    },
  });
}
