# Turbine

Turbine is a [Steam](https://store.steampowered.com/about/) powered file generator! Turbine uses responses from the Steam API to generate text files using [Handlebars templates](https://handlebarsjs.com/guide/). (Currently limited to generating a file for each of a user's owned games, but likely to expand in the future.)

_Turbine is a third party application and is not endorsed nor affiliated with Valve or Steam._

## Installation

You'll need [Node.js](https://nodejs.org/en/download) for your system.

```bash
git clone https://github.com/cromo/turbine.git
cd turbine
npm install
```

This will install all dependencies needed to run turbine.

If you would like to put the `turbine` command on your `PATH`, from within the
cloned repository run:

```bash
npm install --global
```

To remove it:

```bash
npm uninstall --global turbine
```

## Usage

If you installed globally, you can call `turbine` directly, otherwise you can call it within the repository via `npm start`. Running it without arguments will print out usage information.

`turbine` can be configured via command line arguments, environment variables, a JSON configuration file, or any combination of these. The primary way is via command line arguments, which is what is documented below. To use environment variables, remove the leading dashes of the command line argument, convert it to uppercase, replace all hyphens with underscores, and prefix it with `TURBINE_`, e.g. `--steam-api-key` becomes `TURBINE_STEAM_API_KEY`. To use a JSON file, place the argument name without leading dashes as keys in a top level object and pass the filename to the `--config` command line argument. A sample configuration file can be found at `config-example.json`.

At the moment, all calls to `turbine` must specify the `steam` subcommand:

```bash
turbine steam --steam-api-key ...
```

### `--steam-api-key` _string_

**Required.** The [Steam Web API key](https://steamcommunity.com/dev) to use. If you don't have one, you'll have to agree to the Steam API Terms of Use and request one.

### `--steam-id` _string_

**Required.** The ID of the Steam user to get the list of owned games from.

### `--output-filename-template` _string_

**Required.** A Handlebars template to generate names for each file to write. Uses the template context detailed below.

### `--output-template` _string_

**Required.** A Handlebars template to generate the content of each generated file. Uses the template context detailed below.

### `--output-type` _"per-game" | "per-user"_

Whether to generate a file for each game in the response or one file for all games. This can be useful to generate a file per game in one call, then create a file that links to all those generated files. Defaults to `"per-game"`.

### `--mkdirp` _boolean_

Creates directories specified by the result of evaluating `--output-filename-template` if they do not exist. Named after the `mkdir -p` command, which recursively makes directories in a path. Defaults to `false`.

### `--dry-run` _boolean_

Still contact the Steam API and get the response, but print out the actions that would be taken to alter the filesystem instead of performing them. Useful to check paths and template expansions. Defaults to `false`.

### Template context

Per-game templates have access to the following variables:

- `appid`: The numeric ID of the software
- `playtime_forever`: All recorded playtime for the software in minutes
- `playtime_windows_forever`: All recorded playtime on Windows in minutes
- `playtime_mac_forever`: All recorded playtime on macOS in minutes
- `playtime_linux_forever`: All recorded playtime on Linux in minutes
- `rtime_last_played`: Something about the last time the game was played (untested)
- `playtime_disconnected`: Supposedly the amount of time played offline (untested)
- `name`: The name of the software
- `img_icon_url`: Part of a URL for the app's icon. The full URL is `http://media.steampowered.com/steamcommunity/public/images/apps/{{appid}}/{{img_icon_url}}.jpg`
- `safeName`: The name of the software but sanitized so that it can be used as file names

Per-user templates have a top level `games` value that is an array of objects of the above structure.

## Privacy policy

Nothing in this repository or any part of the Turbine application stores or transmits any data to a third party other than Valve via the Steam API. All data provided (including but not limited to your Steam API key) when using Turbine is used to make the necessary request(s) to the Steam API and generate local files as directed by the user.

You are responsible for keeping your Steam API key confidential if you use it with Turbine. You are responsible for abiding by the [Steam Web API Terms of Service](https://steamcommunity.com/dev/apiterms) when using Turbine.

## License

BSD 2-Clause. See [LICENSE file](./LICENSE) for details.
