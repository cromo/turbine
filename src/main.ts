import axios from "axios";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { z } from "zod";

async function parseConfig() {
  // Parse CLI/config/environment using yargs
  // Need:
  // - Steam ID
  // - Steam API key
  // - Template location?
  // - Output location?

  return await (yargs(hideBin(process.argv))
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
}

const baseOwnedGameSchema = z.object({
  appid: z.number().int(),
  playtime_forever: z.number().int(),
  playtime_windows_forever: z.number().int(),
  playtime_mac_forever: z.number().int(),
  playtime_linux_forever: z.number().int(),
  rtime_last_played: z.number().int(),
  playtime_disconnected: z.number().int(),
});
const ownedGameWithAppInfoSchema = baseOwnedGameSchema.extend({
  name: z.string(),
  img_icon_url: z.string(),
  // It seems that this may not be included with all games?
  // content_descriptorids: z.number().int().array(),
});
const getBaseOwnedGamesResponseSchema = z.object({
  response: z.object({
    game_count: z.number().int(),
    games: baseOwnedGameSchema.array(),
  })
});
type GetBaseOwnedGamesResponse = z.infer<typeof getBaseOwnedGamesResponseSchema>;
const getOwnedGamesWithAppInfoResponseSchema = z.object({
  response: z.object({
    game_count: z.number().int(),
    games: ownedGameWithAppInfoSchema.array(),
  })
});
type GetOwnedGamesWithAppInfoResponse = z.infer<typeof getOwnedGamesWithAppInfoResponseSchema>;

type GetOwnedGamesRequest = {
  steamApiKey: string;
  steamId: string;
  includeAppInfo?: boolean;
  includePlayedFreeGames?: boolean;
}

async function getOwnedGames(requestArguments: Omit<GetOwnedGamesRequest, "includeAppInfo"> & { includeAppInfo?: false }): Promise<GetBaseOwnedGamesResponse>
async function getOwnedGames(requestArguments: Omit<GetOwnedGamesRequest, "includeAppInfo"> & { includeAppInfo: true }): Promise<GetOwnedGamesWithAppInfoResponse>
async function getOwnedGames(requestArguments: GetOwnedGamesRequest): Promise<GetBaseOwnedGamesResponse | GetOwnedGamesWithAppInfoResponse>
{
  // Format based partly on https://developer.valvesoftware.com/wiki/Steam_Web_API#GetOwnedGames_.28v0001.29
  // partly on inspecting the response.
  const response = await axios.get(
    "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/",
    {
      params: {
        key: requestArguments.steamApiKey,
        steamid: requestArguments.steamId,
        include_appinfo: requestArguments.includeAppInfo,
        include_played_free_games: requestArguments.includePlayedFreeGames,
        format: "json",
      }
    }
  );
  return requestArguments.includeAppInfo ?
    getOwnedGamesWithAppInfoResponseSchema.parse(response.data) :
    getBaseOwnedGamesResponseSchema.parse(response.data);
}

async function main() {
  const games = await getOwnedGames({
    ...await parseConfig(),
    includeAppInfo: true,
    includePlayedFreeGames: true,
  });
  console.log(games.response.games[0]);
}

main();