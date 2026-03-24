import assert from "node:assert/strict";
import test from "node:test";
import { buildChunksFocusDetailLabels } from "./chunks-focus-detail-messages";
import { chunksPageMessages } from "./chunks-page-messages";

test("buildChunksFocusDetailLabels 会把 chunks 页面文案稳定映射到 focus detail labels", () => {
  const labels = buildChunksFocusDetailLabels();

  assert.equal(labels.title, chunksPageMessages.detailTitle);
  assert.equal(labels.findRelations, chunksPageMessages.detailFindRelations);
  assert.equal(labels.detailRetryEnrichment, chunksPageMessages.detailRetryEnrichment);
  assert.equal(labels.detailOpenAsMain, chunksPageMessages.detailOpenAsMain);
  assert.equal(labels.moveIntoCluster, chunksPageMessages.moveIntoCluster);
  assert.equal(labels.detachClusterMember, chunksPageMessages.detachClusterMember);
  assert.equal(labels.reviewStage, chunksPageMessages.reviewStage);
  assert.equal(labels.speakSentence, chunksPageMessages.speakSentence);
});
