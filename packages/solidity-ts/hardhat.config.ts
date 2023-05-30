import './helpers/hardhat-imports';
import { removeConsoleLog } from 'hardhat-preprocessor';
import type { HardhatUserConfig } from 'hardhat/config';
require('dotenv').config();

import { hardhatArtifactsDir, hardhatDeploymentsDir, typechainOutDir } from '~helpers/constants/toolkitPaths';

function nodeUrl(network: string) {
  return `https://${network}.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`;
}

const mumbaiConfig = {
    url: nodeUrl("polygon-mumbai"),
    gasPrice: 40000000000,
    timeout: 50000,
    accounts: [process.env.DEPLOYER_PK as string],
    saveDeployments: true,
    tags: ["mumbai", "test"]
  }
const mainnetNetworkConfig = {
    url: nodeUrl("polygon-mainnet"),
    // gasPrice: 60000000000,
    // timeout: 500000,
    accounts: [process.env.DEPLOYER_PK as string],
    tags: ["polygon", "production"]
}

export const config: HardhatUserConfig = {
  preprocess: {
    eachLine: removeConsoleLog((hre) => hre.network.name !== 'hardhat' && hre.network.name !== 'localhost'),
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
      mumbai: process.env.DEPLOYER_ADDRESS as string,
    },
    alice: {
        default: 1
    },
    bob: {
        default: 2
    }
  },
  networks: {
    hardhat: {
        // MAINEET FORK:
        // forking: {
        //     url: "https://mainnet.infura.io/v3/fc488ef8542b4fd08cb99fb07b957f64",
        // }
    },
    local: {
        url: 'http://localhost:8545',
    },
    mumbai: mumbaiConfig,
    staging: mumbaiConfig,
    production: mainnetNetworkConfig,
  },
  solidity: {
    compilers: [
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 250,
          },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
    ],
  },
  mocha: {
    bail: false,
    allowUncaught: false,
    require: ['ts-node/register'],
    timeout: 30000,
    slow: 9900,
    reporter: process.env.GITHUB_ACTIONS === 'true' ? 'mocha-junit-reporter' : 'spec',
    reporterOptions: {
      mochaFile: 'testresult.xml',
      toConsole: true,
    },
  },
  watcher: {
    'auto-compile': {
      tasks: ['compile'],
      files: ['./contracts'],
      verbose: false,
    },
  },
  gasReporter: {
    enabled: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: 'USD',
  },
  dodoc: {
    runOnCompile: false,
    debugMode: false,
    keepFileStructure: true,
    freshOutput: true,
    outputDir: './generated/docs',
    include: ['contracts'],
  },
  paths: {
    cache: './generated/hardhat/cache',
    artifacts: hardhatArtifactsDir,
    deployments: hardhatDeploymentsDir,
    deploy: './deploy/hardhat-deploy',
    tests: './tests/hardhat-tests',
  },
  typechain: {
    outDir: typechainOutDir,
    discriminateTypes: true,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
export default config;
