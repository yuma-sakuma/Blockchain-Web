import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: ["0x9086dd4fa40775839848b41923e5394bd5062f5764e9da15e03a286a28e15c7d"]
    }
  }
};

export default config;
