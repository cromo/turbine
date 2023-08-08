import axios from "axios";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";


async function parseConfig() {
  // Parse CLI/config/environment using yargs
  // Need:
  // - Steam ID
  // - Steam API key
  // - Template location?
  // - Output location?

  const config = await (yargs(hideBin(process.argv))
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
    .argv);
  console.log(config);
  return config;
}

async function getOwnedGames(requestArguments: { steamApiKey: string; steamId: string; }) {
  console.log("getOwnedGames", requestArguments);
  const response = await axios.get(
    `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${requestArguments.steamApiKey}&steamid=${requestArguments.steamId}&format=json`
  );
  console.log("response from steam", response);
}

async function main() {
  await getOwnedGames(await parseConfig());
}

main();