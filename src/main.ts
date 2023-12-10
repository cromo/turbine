import Handlebars from "handlebars";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { z } from "zod";
import path from "node:path";
import * as fs from "node:fs/promises";
import { generateSteam } from "./steam";

async function parseConfig() {
  return await yargs(hideBin(process.argv))
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
    })
    .option("output-filename-template", {
      alias: "o",
      demandOption: true,
      describe: "A handlebars template to use for the filename of each game",
      type: "string",
      coerce: (template: string) =>
        Handlebars.compile(template, { noEscape: true }),
    })
    .option("output-template", {
      alias: "t",
      demandOption: true,
      describe:
        "A handlebars template to evaluate for each game and write to file",
      type: "string",
      coerce: (template: string) =>
        Handlebars.compile(template, { noEscape: true }),
    })
    .option("mkdirp", {
      alias: "d",
      describe: "Create directories in file path if they don't exist",
      type: "boolean",
    })
    .option("dry-run", {
      describe: "Request the data but only output the actions taken after that",
      type: "boolean",
      default: false,
    })
    .env("TURBINE")
    .config().argv;
}

function dryRunLog(log: { action: string; [Key: string]: unknown }) {
  console.debug(JSON.stringify(log));
}

async function makeDirectoryPathForFile(
  filename: string,
  config?: { dryRun: boolean },
) {
  const directory = path.dirname(filename);
  if (config?.dryRun) {
    dryRunLog({
      action: "create directory",
      path: directory,
      absolutePath: path.resolve(directory),
    });
    return;
  }
  await fs.mkdir(directory, { recursive: true });
}

async function writeContentsToFile(
  filename: string,
  content: string,
  config?: { dryRun: boolean },
) {
  if (config?.dryRun) {
    dryRunLog({ action: "write file", filename, content });
    return;
  }
  await fs.writeFile(filename, content);
}

async function main() {
  const config = await parseConfig();
  const fileWriter = buildFileWriter(config);
  await generateSteam(config, fileWriter);
}

function buildFileWriter<TemplateContext = any>(config: {
  outputFilenameTemplate: HandlebarsTemplateDelegate<any>;
  outputTemplate: HandlebarsTemplateDelegate<any>;
  mkdirp: boolean | undefined;
  dryRun: boolean;
}): (templateContext: TemplateContext) => Promise<void> {
  return async (templateContext: TemplateContext): Promise<void> => {
    const filename = config.outputFilenameTemplate(templateContext);
    const content = config.outputTemplate(templateContext);
    if (config.mkdirp) {
      await makeDirectoryPathForFile(filename, config);
    }
    await writeContentsToFile(filename, content, config);
  };
}

main();
