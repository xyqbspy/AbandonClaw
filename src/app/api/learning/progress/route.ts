import { handleLearningProgressGet } from "../handlers";

export async function GET(request: Request) {
  return handleLearningProgressGet(request);
}

