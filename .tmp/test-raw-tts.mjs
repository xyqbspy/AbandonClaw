import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { mkdir } from "node:fs/promises";

const t = new MsEdgeTTS();
await mkdir(".tmp/edge-tts-test", { recursive: true });
await t.setMetadata("en-US-JennyNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="en-US-JennyNeural">Hello world.</voice>
</speak>`;
const r = await t.rawToFile(".tmp/edge-tts-test", ssml);
console.log(r);
t.close();
