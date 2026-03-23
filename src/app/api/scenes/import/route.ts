import { handleSceneImportPost } from "./handlers";

export async function POST(request: Request) {
  return handleSceneImportPost(request);
}
