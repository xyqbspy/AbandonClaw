import { handleSceneLearningStartPost } from "../handlers";

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handleSceneLearningStartPost(context);
}

