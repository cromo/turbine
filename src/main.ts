import axios from "axios";
import Handlebars from "handlebars";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { z } from "zod";
import path from "node:path";
import * as fs from "node:fs/promises"

async function parseConfig() {
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
    .option("output-filename-template", {
      alias: "o",
      demandOption: true,
      describe: "A handlebars template to use for the filename of each game",
      type: "string",
      coerce: (template: string) => Handlebars.compile(template),
    })
    .option("output-template", {
      alias: "t",
      demandOption: true,
      describe: "A handlebars template to evaluate for each game and write to file",
      type: "string",
      coerce: (template: string) => Handlebars.compile(template),
    })
    .option("mkdirp", {
      alias: "d",
      describe: "Create directories in file path if they don't exist",
      type: "boolean",
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
  // Can be combined with the appid to form an image URL via:
  // http://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{hash}.jpg
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

// Based on https://stackoverflow.com/a/31976060
const forbiddenPattern = /[<>:"/\\|?*]|[\x00-\x1F]|^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..+)?$|[ .]$/i
function isValidFilename(name: string): boolean {
  return !forbiddenPattern.test(name);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/(?<! ): /g, " - ")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim();
}

async function main() {
  const config = await parseConfig();
  const { response: { games } } = await getOwnedGames({
    ...config,
    includeAppInfo: true,
    includePlayedFreeGames: true,
  });
  await Promise.all(games.map(async (game) => {
    const templateContext = { ...game, safeName: sanitizeFilename(game.name) };
    const filename = config.outputFilenameTemplate(templateContext);
    const content = config.outputTemplate(templateContext);
    if (config.mkdirp) {
      await fs.mkdir(path.dirname(filename), { recursive: true });
    }
    await fs.writeFile(filename, content);
  }));
}

main();