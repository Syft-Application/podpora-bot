# Support Bot v2

Support Slack Bot in TypeScript

# Table of contents:

- [Pre-reqs](#pre-reqs)
- [Getting started](#getting-started)
- [Deploying the app](#deploying-the-app)
- [Project Structure](#project-structure)
- [Building the project](#building-the-project)
- [Testing](#testing)
- [ESLint](#eslint)
- [License](#license)

# Prerequisites
- [Node.js](https://nodejs.org/en/)
- [Slack](https://slack.dev)
- [Jira](https://www.atlassian.com/software/jira)
- [Redis](https://redis.io/)

# Getting started
- Clone the repository
```
git clone --depth=1 https://github.com/keram/podpora-bot.git
```
- Install dependencies
```
cd podpora-bot
npm install
```

- Build and run the project
```
npm run build
npm start
```

Visit `http://localhost:3000`

# Deploying the app

todo

# Development

## Prerequisites
- [Node.js](https://nodejs.org/en/)
- [Overcommit](https://github.com/sds/overcommit)
- [Redis](https://redis.io/)

- Clone the repository
```
git clone --depth=1 https://github.com/project-owner/project_name.git <project_name>
```
- Install dependencies
```
cd <project_name>
npm install
```
- Install overcommit
```
overcommit -i
```

## Running tests
`npm run test`

## ESLint
```
npm run build   // runs full build including ESLint
npm run lint    // runs only ESLint
```

## License
Copyright (c) Marek L. All rights reserved.
Licensed under the [MIT](LICENSE) License.
