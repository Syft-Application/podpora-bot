# Support Bot v2

Support Slack Bot in TypeScript

# Table of contents:

- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Deployment](#deployment)
- [Development](#development)
- [TO-DO](#todo)
- [License](#license)

# Prerequisites
- [Node.js](https://nodejs.org/en/)
- [Slack](https://slack.dev)
- [Jira](https://www.atlassian.com/software/jira)

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

Set in production ENV variables specified in .env.example
where key is Slack Team id

# Development

## Prerequisites
- [Node.js](https://nodejs.org/en/)
- [Overcommit](https://github.com/sds/overcommit)

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
Check all available tasks to use for development.
```
npm run --list
```

# To-do

https://github.com/Syft-Application/podpora-bot/issues

# License
Copyright (c) Marek L. All rights reserved.
Licensed under the [MIT](LICENSE) License.
