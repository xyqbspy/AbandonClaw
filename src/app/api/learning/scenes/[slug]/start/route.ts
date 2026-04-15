import { handleSceneLearningStartPost } from "../handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handleSceneLearningStartPost(context, undefined, request);
}

