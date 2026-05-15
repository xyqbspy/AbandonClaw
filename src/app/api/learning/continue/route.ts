import { handleContinueLearningGet } from "../handlers";

export async function GET(request: Request) {
  return handleContinueLearningGet(undefined, request);
}

