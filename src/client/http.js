const xhr = require("axios");
const byteArray2hexStr = require("../utils/bytes").byteArray2hexStr;
const deserializeTransaction = require("../protocol/serializer").deserializeTransaction;
const bytesToString = require("../utils/bytes").bytesToString;
const {base64DecodeFromString} = require("../utils/bytes");
const {Block, Transaction} = require("../protocol/core/Tron_pb");
const {AccountList, NumberMessage, WitnessList} = require("../protocol/api/api_pb");
const {TransferContract} = require("../protocol/core/Contract_pb");

class HttpClient {

  constructor(options = {}) {
    this.hostname = options.hostname || "tronscan.io";
    this.port = options.port || 80;

    /**
     * @type {WalletClient}
     */
    this.url = `https://${this.hostname}`;
    if (this.port !== 80) {
      this.url+= `:${this.port}`;
    }
  }

  /**
   * Retrieve latest block
   *
   * @returns {Promise<*>}
   */
  async getLatestBlock() {
    let {data} = await xhr.get(`${this.url}/getBlockToView`);
    let currentBlock = base64DecodeFromString(data);
    let block = Block.deserializeBinary(currentBlock);

    return {
      number: block.getBlockHeader().getRawData().getNumber(),
      witnessId: block.getBlockHeader().getRawData().getWitnessId(),
    };
  }

  /**
   * Retrieve block by number
   *
   * @returns {Promise<*>}
   */
  async getBlockByNum(blockNumber) {
    let {data} = await xhr.get(`${this.url}/getBlockByNumToView?num=${blockNumber}`);
    let currentBlock = base64DecodeFromString(data);
    let blockData = Block.deserializeBinary(currentBlock);

    let recentBlock = base64DecodeFromString(data);

    return {
      size: recentBlock.length,
      number: blockData.getBlockHeader().getRawData().getNumber(),
      witnessAddress: byteArray2hexStr(blockData.getBlockHeader().getRawData().getWitnessAddress()),
      time: blockData.getBlockHeader().getRawData().getTimestamp(),
      transactionsCount: blockData.getTransactionsList().length,
      contraxtType: Transaction.Contract.ContractType,
      transactions: blockData.getTransactionsList().map(deserializeTransaction),
    };
  }

  /**
   * Retrieve the total number of transactions
   * @returns {Promise<number>}
   */
  async getTotalNumberOfTransactions() {
    let {data} = await xhr.get(`${this.url}/getTotalTransaction`);
    let totalTransaction = base64DecodeFromString(data);
    let totalData = NumberMessage.deserializeBinary(totalTransaction);
    return totalData.getNum();
  }

  /**
   * Retrieve all accounts
   * @returns {Promise<*>}
   */
  async getAccountList() {

    let {data} = await xhr.get(`${this.url}/accountList`);

    let bytesAccountList = base64DecodeFromString(data);
    let account = AccountList.deserializeBinary(bytesAccountList);
    let accountList = account.getAccountsList();

    return accountList.map(account => {
      let name = bytesToString(account.getAccountName());
      let address = byteArray2hexStr(account.getAddress());
      let balance = account.getBalance();
      let balanceNum = 0;
      if (balance !== 0) {
        balanceNum = (balance / 1000000).toFixed(6);
      }
      return {
        name,
        address,
        balance,
        balanceNum,
      };
    });
  }

  /**
   * Retrieves all witnesses
   *
   * @returns {Promise<*>}
   */
  async getWitnesses() {
    let {data} = await xhr.get(`${this.url}/witnessList`);

    let bytesWitnessList = base64DecodeFromString(data);
    let witness = WitnessList.deserializeBinary(bytesWitnessList);
    let witnessList = witness.getWitnessesList();

    return witnessList.map(witness => {

      return {
        address: byteArray2hexStr(witness.getAddress()),
        latestBlockNumber: witness.getLatestblocknum(),
        producedTotal: witness.getTotalproduced(),
        missedTotal: witness.getTotalmissed(),
        votes: witness.getVotecount(),
      };
    });
  }

}

module.exports = HttpClient;
