import { handleReviewDueGet } from "../handlers";

export async function GET(request: Request) {
  return handleReviewDueGet(request);
}
