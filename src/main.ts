import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Parse CLI/config/environment using yargs
// Add config file via https://github.com/yargs/yargs/blob/HEAD/docs/api.md#configobject
// Add environment via https://github.com/yargs/yargs/blob/HEAD/docs/api.md#envprefix
// Need:
// - Steam ID
// - Steam API key
// - Template location?
// - Output location?

const config = yargs(hideBin(process.argv))
  .option("steam-api-key", {
    alias: "k",
    demandOption: true,
    describe: "Your Steam API key",
    type: "string",
  })
  .option("steam-id", {
    alias: "i",
    demandOption: true,
    describe: "The Steam ID of your account",
    type: "string",
  })
  .env("TURBINE")
  .config()
  .argv;
console.log(config);