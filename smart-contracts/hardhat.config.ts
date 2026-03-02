import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: [
        "0x9086dd4fa40775839848b41923e5394bd5062f5764e9da15e03a286a28e15c7d",
        "0x8427e08871215b02bbddfceb68c1f6397d49f66e9f4809103701af7c0149515e",
        "0x2170b10965a4e9d75cbe0fe291bd2bf1814951d82691ee915aa8d5f62962a25e",
        "0x89e84c68e95fafe131748d6dd75d14b7280c0b9db6e6cf0962f6fc349eca64f0",
        "0xb83fa6c0b280bee3e8e741460719ead11e7b292f9f6931831418de6b274d7d69",
        "0x23aca4dbec9833b93cb4b684b88fcc14725548059a6af3e0e1d81080506b9ebd"
      ]
    }
  }
};

export default config;