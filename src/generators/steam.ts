import axios from "axios";
import yargs from "yargs";
import { z } from "zod";
import { sanitizeFilename } from "../filename";

export const command = "steam";
export const description = "Get owned game data from Steam";

export const argumentParser = (yargs: yargs.Argv) =>
  yargs
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
    .option("output-type", {
      default: "per-game",
      choices: ["per-game", "per-user"],
      describe:
        "Whether to apply the template once per game or for a user's entire library at once",
      type: "string",
      coerce: (choice: string) =>
        z.enum(["per-game", "per-user"]).parse(choice),
    });

export async function generator(
  config: unknown,
  fileWriter: (templateContext: any) => Promise<void>,
) {
  const parsedConfig = z
    .object({
      steamApiKey: z.string(),
      steamId: z.string(),
      outputType: z.enum(["per-game", "per-user"]),
    })
    .parse(config);
  const {
    response: { games },
  } = await getOwnedGames({
    ...parsedConfig,
    includeAppInfo: true,
    includePlayedFreeGames: true,
  });
  const generator =
    parsedConfig.outputType === "per-game"
      ? generateFilesPerGame
      : generateFilePerUser;
  await generator(games, fileWriter);
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
type OwnedGameWithAppInfo = z.infer<typeof ownedGameWithAppInfoSchema>;

const getBaseOwnedGamesResponseSchema = z.object({
  response: z.object({
    game_count: z.number().int(),
    games: baseOwnedGameSchema.array(),
  }),
});
type GetBaseOwnedGamesResponse = z.infer<
  typeof getBaseOwnedGamesResponseSchema
>;

const getOwnedGamesWithAppInfoResponseSchema = z.object({
  response: z.object({
    game_count: z.number().int(),
    games: ownedGameWithAppInfoSchema.array(),
  }),
});
type GetOwnedGamesWithAppInfoResponse = z.infer<
  typeof getOwnedGamesWithAppInfoResponseSchema
>;

type GetOwnedGamesRequest = {
  steamApiKey: string;
  steamId: string;
  includeAppInfo?: boolean;
  includePlayedFreeGames?: boolean;
};

async function getOwnedGames(
  requestArguments: Omit<GetOwnedGamesRequest, "includeAppInfo"> & {
    includeAppInfo?: false;
  },
): Promise<GetBaseOwnedGamesResponse>;
async function getOwnedGames(
  requestArguments: Omit<GetOwnedGamesRequest, "includeAppInfo"> & {
    includeAppInfo: true;
  },
): Promise<GetOwnedGamesWithAppInfoResponse>;
async function getOwnedGames(
  requestArguments: GetOwnedGamesRequest,
): Promise<GetBaseOwnedGamesResponse | GetOwnedGamesWithAppInfoResponse> {
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
      },
    },
  );
  return requestArguments.includeAppInfo
    ? getOwnedGamesWithAppInfoResponseSchema.parse(response.data)
    : getBaseOwnedGamesResponseSchema.parse(response.data);
}

async function generateFilesPerGame(
  games: OwnedGameWithAppInfo[],
  fileWriter: (context: any) => Promise<void>,
) {
  await Promise.all(
    games.map(async (game) =>
      fileWriter({ ...game, safeName: sanitizeFilename(game.name) }),
    ),
  );
}

async function generateFilePerUser(
  games: OwnedGameWithAppInfo[],
  fileWriter: (context: any) => Promise<void>,
) {
  await fileWriter({
    games: games.map((game) => ({
      ...game,
      safeName: sanitizeFilename(game.name),
    })),
  });
}
