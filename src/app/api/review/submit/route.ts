import { handleReviewSubmitPost } from "../handlers";

export async function POST(request: Request) {
  return handleReviewSubmitPost(request);
}
