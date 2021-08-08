# BGSBot Installation, Development, and Contribution Guide

Thank you for contributing to this project. All contributions are welcome. But for the sake of sanity, please follow the guidelines to contribute to BGSBot.

## Requirements

BGSBot requires a few things to get going:

1. Git and Github account
2. A recent Node.js LTS version, v12.18.2 (Erbium) and above
3. MongoDB 4.0 and above
5. Configure secrets for the application
6. A Discord account for Discord bot registration

On the server or development workstation, Node.js, and MongoDB must be installed and correctly working. Otherwise, these instructions may fail.

See below on how to contribute using branches and pull requests.

### Optional Requirements

- An IDE or code editor is highly recommended, preferably with Node.js integration and debugger
- GitHub Desktop can make working with GitHub a lot easier on Windows or Mac platforms
- A Bugsnag account and API token if you want crash reporting and analysis

## Install and configure servers

### Install node.js and npm

Download the latest stable version of Node.js for your platform, and let it install. After installation, restart your terminal or PowerShell window to ensure that Node.js is now on the default path and check that both these commands work:

```console
    foo@bar:~$ node -v
    v12.18.2
    foo@bar:~$ npm -v
    6.14.4
```

Update npm:

```console
    foo@bar:~$ npm update
```

### Install and Configure MongoDB

- Install [MongoDB](https://www.mongodb.com/what-is-mongodb), and use the default port 27017
- Enabling [access control](https://docs.mongodb.com/manual/tutorial/enable-authentication/) is essential for production environments and optional for development environments.
- Create a database in the MongoDB instance, `bgsbot` containing a single collection called `guilds`

## Obtain source code and install dependencies

Building BGSBot is relatively straightforward if taken step by step. Being a more extensive app split into five parts, there's a bit more work than a typical demo or a smaller application.

### Fork and then clone the BGSBot repo

```console
    foo@bar:~$ git clone git@github.com:[your-username]/bgsbot.git
```

### Install dependencies

Let's first get all the dependencies needed to build and run the underlying servers that run BGSBot installed.

```console
    foo@bar:~$ npm i
```

Please address any errors you see, such as installing missing node modules, such as say `lodash` or similar. This may happen when the code demands a module that is not yet in package.json, but is needed:

```console
    foo@bar:~$ npm install --save <module> 
```

This will include the package in package.json as well as install it locally. This should then allow a clean `npm i' with no errors. Please [report missing packages as an issue](https://github.com/Elite-Kode/bgsbot/issues).

## Configure source code

### Create a secrets file

The secrets file is used by BGSBot to store configurable properties.

Create a new `secrets.ts` file in the `src` folder:

#### src/secrets.ts

```ts
  "use strict";
  
  // Authenticated MongoDB (not default, strongly recommended in prod). Comment out if not using authentication
  class DiscordSecrets {
    public static readonly token: string = "[Discord token for bot]";
  }

  class DBSecrets {
    public static readonly userName: string = "[username for bgsbot db]";
    public static readonly password: string = "[password for bgsbot db]";
    public static readonly url: string = "mongodb://localhost:27017/bgsbot";
  }

  class BugsnagSecrets {
    public static readonly token: string = "[Bugsnag token for the Express app]";
    public static readonly use: boolean = [true/false];
  }

  export { DiscordSecrets, DBSecrets, BugsnagSecrets };
```

- `DBSecrets.userName` if you have set up MongoDB access control (mandatory in production environments), the username for the bgsbot collection, or blank in development
- `DBSecrets.password` if you have set up MongoDB access control (mandatory in production environments), the password for the bgsbot collection, or blank in development
- `DBSecrets.url` BGSBot assumes a local MongoDB installation on port 27017. Change this if you have a cloud or different MongoDB configuration
- `DiscordSecrets.token` is your Discord bot token. [Read here for info](https://discord.com/developers/docs/topics/oauth2)
- `BugsnagSecrets.use` enables BugSnag if set to true, set to false otherwise
- `BugsnagSecrets.token` is your BugSnag API key for thhe Express app. Please don't set it if `BugsnagSecrets.use` is `false`

NB: Although MongoDB access control is strongly recommended, MongoDB has significant password composition limitations. We suggest a long random alphanumeric password rather than a highly complex password because many punctuation characters, including `;` are not valid MongoDB passwords.

> **Security notice:** Do not add or commit your secrets to Git.

### Build BGSBot frontend
 
BGSBot is a TypeScript application, and it needs to be transpiled into a Node.js-friendly code. To do this, we first install TypeScript command line tools, which the build process uses, and then build the code:

```console
    foo@bar:~$ cd bgsbot
    foo@bar:~$ npm install -g typescript
    foo@bar:~$ tsc -v
    Version 4.1.5
```

If `tsc` works, we can go ahead and build bgsbot:

```console
    foo@bar:~$ gulp
```

Please take care of any errors you see. Sometimes, two attempts are required to get a successful build. You may need to add more node modules locally to get it to build. In development, you will likely see warnings about the production environment not being used, and that's correct. Developers can generally ignore other alerts as long as the build succeeds. Feel free to submit a pull request to fix or address these warnings.

### Monitor BGSBot via BugSnag

BugSnag is an error capture and analysis platform. This is great for production, but as you have access to errors in the console, it's unnecessary for development unless you're testing BugSnag integration or fixing issues with BugSnag. If you are using the free Lite tier, it has limited events per day. If you are in development mode, consider only using BugSnag integration if you intend to work on or test BugSnag related functionality.

If you want to use BugSnag, create a BugSnag account, then an application, and obtain the application's API key.

Create an Express application for BGSBot and

- set `BugsnagSecrets.use` to `true`
- set ``BugsnagSecrets.token` to your BugSnag application API key

> **Security notice:** Do not add or commit your secrets to Git.

## Running and debugging BGSBot

### Ports

BGSBot runs on the following default ports

| Prod | Dev | Debug |
| -- | -- | -- |
| 4002 | 3002 | 9229 |

### Development Mode

If you've read this far, you're likely to be developing BGSBot or want to run your custom version. Developers can start development mode in their IDE, via the command line, or within a debugger like this:

```console
    foo@bar:~$ cd bgsbot
    foo@bar:~$ npm run startdev
```

You can also use your IDE to navigate to `package.json` and configure, run, or debug a script target, which gives you great control over the development process.

### Production Mode

To execute the project in production mode:

```console
    foo@bar:~$ cd bgsbot
    foo@bar:~$ npm run start
```

Review the HTTP ports above or set up a port forwarding or caching configuration to scale and serve many clients.

You will need to establish a TLS listener and, if very busy, a load balancer, such as via a cloud router or Nginx or Apache Reverse Proxy, and ensure that your URL's DNS servers point to your server and the URL you have chosen.

## Contributing fixes and enhancements back to BGSBot

BGSBot is an open-source project and relies upon contributors such as yourself fixing issues or creating new features for the benefit of all. BGSBot follows standard GitHub industry practices, including that new fixes or features should be in their branch and committed via a pull request. GitHub has many excellent articles on how to install and get going with pull requests and branches.

### Working on a branch

Find an issue you want to fix or enhance, and let folks know that you want to work on it. Create a new branch for your issue or enhancement:

`git checkout -b [name-of-your-new-branch]`

### Create a pull request for your issue fix or enhancement

After you have made the necessary changes and committed them, push them to your forked repository. Then create a pull request to the `master` base branch.

I will review the PR and might ask to make changes before accepting them.
