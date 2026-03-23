import { handleSceneParsePost } from "./handlers";

export async function POST(request: Request) {
  return handleSceneParsePost(request);
}
