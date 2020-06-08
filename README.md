# Support Bot v2

Support Slack Bot in TypeScript

# Table of contents:

- [Pre-reqs](#prerequisites)
- [Getting started](#getting-started)
- [Deployment](#deployment)
- [Development](#development)
- [TODO](#todo)
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

# Deployment

todo

# Development

## Prerequisites
- [Node.js](https://nodejs.org/en/)
- [Overcommit](https://github.com/sds/overcommit)
- [Redis](https://redis.io/)

- Clone the repository
```
git clone --depth=1 https://github.com/keram/podpora-bot.git
cd podpora-bot
```
- Install dependencies
```
npm install
```
- Install overcommit
```
gem install overcommit
overcommit -i
```

## Running tests
`npm run test`

## ESLint
```
npm run build   // runs full build including ESLint
npm run lint    // runs only ESLint
```

## More
Check all available tasks to use for developmnet.
```
npm run --list
```

# Todo

- Readme details on app configuration.
- Upgrade Slack dialogs to modals https://api.slack.com/block-kit/dialogs-to-modals
- Test that correct dialog is open when different commands are send
- Define shortcuts for support requests https://api.slack.com/interactivity/shortcuts
- Use pattern from https://www.npmjs.com/package/@slack-wrench/jest-mock-web-client
  to mock slack api
# License
Copyright (c) Marek L. All rights reserved.
Licensed under the [MIT](LICENSE) License.
