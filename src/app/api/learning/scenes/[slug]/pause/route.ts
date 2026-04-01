import { handleSceneLearningPausePost } from "../handlers";

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handleSceneLearningPausePost(context);
}

