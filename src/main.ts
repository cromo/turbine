import Handlebars from "handlebars";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import path from "node:path";
import * as fs from "node:fs/promises";

type GeneratorSubcommand = {
  command: string;
  description: string;
  argumentParser: (yargs: yargs.Argv) => yargs.Argv;
  generator: (
    config: unknown,
    fileWriter: (templateContext: any) => Promise<void>,
  ) => Promise<void>;
};

async function parseConfig(subcommands: GeneratorSubcommand[]) {
  const parser = yargs(hideBin(process.argv));
  subcommands.forEach(({command, description, argumentParser})=> parser.command(command, description, argumentParser))
  return await parser
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
    .demandCommand(1, "Must specify a generator to use")
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
  const generatorsByCommand: Record<string, GeneratorSubcommand> = {
    steam: await import("./generators/steam")
  };

  const config = await parseConfig(Object.values(generatorsByCommand));
  const generator = config._[0];
  await generatorsByCommand[generator].generator(config, buildFileWriter(config));
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
