import {
  buildDryRunPreview,
  buildPublicRegistrationBaselineConfig,
  runPublicRegistrationBaseline,
} from "./load-public-registration-http-baseline-lib";

async function main() {
  const config = buildPublicRegistrationBaselineConfig(process.argv.slice(2));

  if (config.dryRun) {
    console.log(JSON.stringify(buildDryRunPreview(config), null, 2));
    return;
  }

  const result = await runPublicRegistrationBaseline(config);
  console.log(JSON.stringify(result, null, 2));
}

void main().catch((error) => {
  console.error("[load-public-registration-http-baseline] failed", error);
  process.exitCode = 1;
});
