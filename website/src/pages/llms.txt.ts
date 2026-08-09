import { buildLlmsTxt, getAgentReference, textHeaders } from "../lib/agent-reference";

export async function GET() {
  const reference = await getAgentReference();

  return new Response(buildLlmsTxt(reference), {
    headers: textHeaders("text/plain", reference.version),
  });
}
