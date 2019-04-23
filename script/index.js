const dotenv = require('dotenv');
const CoreApp = require('./core-app').CoreApp;
const truffle = require('../truffle');
dotenv.config();

const coreApp = new CoreApp(truffle.networks[process.env.TRUFFLE_NETWORK_ALIAS], process.env.TRUFFLE_NETWORK_ALIAS);
coreApp.transferOwnerships();
// coreApp.transferBackOwnerships();
// coreApp.finalize();

