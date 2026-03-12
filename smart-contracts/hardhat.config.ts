import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenv.config();

// Collect all role-specific private keys into a single accounts array
const privateKeys: string[] = [];
const keyNames = [
  "DEPLOYER_PRIVATE_KEY",
  "MANUFACTURER_PRIVATE_KEY",
  "DEALER_PRIVATE_KEY",
  "DLT_OFFICER_PRIVATE_KEY",
  "CONSUMER_PRIVATE_KEY",
  "LENDER_PRIVATE_KEY",
  "INSURER_PRIVATE_KEY",
  "SERVICE_PROVIDER_PRIVATE_KEY",
  "INSPECTOR_PRIVATE_KEY",
];

for (const name of keyNames) {
  const key = process.env[name];
  if (key) {
    privateKeys.push(key);
  }
}

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      url: process.env.GANACHE_RPC_URL || "http://127.0.0.1:7545",
      accounts: privateKeys.length > 0 ? privateKeys : undefined,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    }
  }
};

export default config;