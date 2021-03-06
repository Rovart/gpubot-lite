# GPU Bot - Lite

Auto-buy a GPU you want once reaches the price you desire!

## Stores

- Coolmod (Outlet included)


**The bot may fail from time to time due changes in the website.**

> ⚠️ Disclaimer: Please note that this is a research project. I am by no means responsible for any usage of this tool. Use it on your behalf.

## Other stores available:

- PcComponentes
- LDLC
- XTREMMEDIA

To receive alarms for these stores join to my telegram channel, please make sure to own Bitcoin over Lightning Network as there is an entry fee.

https://t.me/+25dIS4KhRKU3MzY8

## Requirements

You will need Node.js and a node global package installed in your environement. Yarn is recommended as a package manager and script runner over npm.

### Node and npm

- #### Node installation on Windows

  Just go on [official Node.js website](https://nodejs.org/) and download the installer.
  Also, be sure to have `git` available in your PATH, `npm` might need it (You can find git [here](https://git-scm.com/)).

- #### Node installation on Ubuntu

  You can install nodejs and npm easily with apt install, just run the following commands.

  $ sudo apt install nodejs
  $ sudo apt install npm

- #### Other Operating Systems

  You can find more information about the installation on the [official Node.js website](https://nodejs.org/) and the [official NPM website](https://npmjs.org/).

If the installation was successful, you should be able to run the following command.

    $ node --version
    v14.16.1

    $ npm --version
    7.12.0

If you need to update `npm`, you can make it using `npm`! Cool right? After running the following command, just open again the command line and be happy.

    $ npm install npm -g

### Yarn

You can install yarn after installing npm with the following command.

    $ npm install --global yarn

If the installation was successful, you should be able to run the following command.

    $ yarn --version
    1.22.10

## Install

    $ git clone https://github.com/Rovart/gpubot
    $ cd gpubot
    $ yarn

## Configure bot

Edit the `config.json` file with your user and password settings (if you want to buy at the outlet you must fill it too) and enable `purchase`.

Edit `articles.json` to configure GPU prices and enable the `purchase` fields on the GPUs you want.

> ⚠️ Warning: Please notice there are two lists at `articles.json`. First array has usual GPU prices while second array has Outlet GPU prices.

## Running the project

    $ yarn start

## Credits

This project uses modified code from:
- https://github.com/elpatronaco/pccomponentes-buy-bot
- https://github.com/joanroig/pccomponentes-bot/
