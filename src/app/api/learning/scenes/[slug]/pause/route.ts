import { handleSceneLearningPausePost } from "../handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handleSceneLearningPausePost(context, undefined, request);
}

