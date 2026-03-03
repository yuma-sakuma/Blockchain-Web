import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      url: process.env.GANACHE_RPC_URL || "http://127.0.0.1:7545",
      ...(process.env.GANACHE_KEYS ? { accounts: process.env.GANACHE_KEYS.split(",") } : {})
    }
  }
};

export default config;