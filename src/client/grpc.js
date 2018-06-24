const caller = require('grpc-caller');
const {
  EmptyMessage, NumberMessage, BytesMessage, BlockLimit, EasyTransferMessage
} = require('../protocol/api/api_pb');
const { WalletClient } = require('../protocol/api/api_grpc_pb');
const { decode58Check } = require('../utils/crypto');
const { bytesToString } = require('../utils/bytes');
const { Account } = require('../protocol/core/Tron_pb');
const { stringToBytes, hexStr2byteArray, base64DecodeFromString } = require('../lib/code');
const { deserializeBlock, deserializeBlocks } = require('../utils/block');
const { deserializeAsset, deserializeAssets } = require('../utils/asset');
const { deserializeAccount } = require('../utils/account');
const { deserializeWitnesses } = require('../utils/witness');
const { deserializeTransaction, deserializeEasyTransfer } = require('../utils/transaction');

class GrpcClient {
  constructor(options) {
    this.hostname = options.hostname;
    this.port = options.port || 50051;

    /**
     * @type {WalletClient}
     */
    this.api = caller(`${this.hostname}:${this.port}`, WalletClient);
  }

  /**
   * Retrieve all connected witnesses
   *
   * @returns {Promise<*>}
   */
  async getWitnesses() {
    const witnesses = await this.api.listWitnesses(new EmptyMessage());
    return deserializeWitnesses(witnesses);
  }

  /**
   * Retrieve all connected nodes
   *
   * @returns {Promise<*>}
   */
  getNodes() {
    return this.api.listNodes(new EmptyMessage())
      .then(x => x.getNodesList());
  }

  async getAssetIssueList() {
    const assetsListRaw = await this.api.getAssetIssueList(new EmptyMessage());
    return deserializeAssets(assetsListRaw);
  }

  async getAssetIssueByName(assetName) {
    const assetByte = new BytesMessage();
    assetByte.setValue(new Uint8Array(stringToBytes(assetName)));
    const assetIssue = await this.api.getAssetIssueByName(assetByte);
    return deserializeAsset(assetIssue);
  }

  /**
   * Retrieves a account by the given address
   *
   * @param {address} string account address
   * @returns {Promise<*>}
   */
  async getAccount(address) {
    const accountArg = new Account();
    accountArg.setAddress(new Uint8Array(decode58Check(address)));
    const accountRaw = await this.api.getAccount(accountArg);
    return deserializeAccount(accountRaw);
  }

  /**
   * Retrieves a block by the given number
   *
   * @param {number} number block number
   * @returns {Promise<*>}
   */
  async getBlockByNumber(number) {
    const message = new NumberMessage();
    message.setNum(number);
    const blockRaw = await this.api.getBlockByNum(message);
    return deserializeBlock(blockRaw);
  }

  async getBlockByLimitNext(start, end) {
    const message = new BlockLimit();
    message.setStartnum(start);
    message.setEndnum(end);
    const blocksRaw = await this.api.getBlockByLimitNext(message);
    return deserializeBlocks(blocksRaw);
  }

  async getBlockByLatestNum(limit = 1) {
    const message = new NumberMessage();
    message.setNum(limit);
    const blocksRaw = await this.api.getBlockByLatestNum(message);
    return deserializeBlocks(blocksRaw);
  }

  /**
   * Retrieve latest block
   *
   * @returns {Promise<*>}
   */
  async getLatestBlock() {
    const lastBlockRaw = await this.api.getNowBlock(new EmptyMessage());
    return deserializeBlock(lastBlockRaw);
  }

  async getTransactionById(txHash) {
    const txByte = new BytesMessage();
    txByte.setValue(new Uint8Array(hexStr2byteArray(txHash.toUpperCase())));
    const transaction = await this.api.getTransactionById(txByte);
    return deserializeTransaction(transaction)[0];
  }

  async getTotalTransaction() {
    const totalTransactions = await this.api.totalTransaction(new EmptyMessage());
    return totalTransactions.toObject().num;
  }

  async getNextMaintenanceTime() {
    const nextMaintenanceTime = await this.api.getNextMaintenanceTime(new EmptyMessage());
    return nextMaintenanceTime.toObject();
  }

  async broadcastTransaction(transaction) {
    let broadcastTransactionAnswer = await this.api.broadcastTransaction(transaction);
    broadcastTransactionAnswer = broadcastTransactionAnswer.toObject();
    broadcastTransactionAnswer.message = bytesToString(Array.from(base64DecodeFromString(broadcastTransactionAnswer.message)));
    return broadcastTransactionAnswer;
  }

  async easyTransfer(passPhrase, toAddress, amount) {
    const easyTransferMessage = new EasyTransferMessage();
    easyTransferMessage.setPassphrase(Uint8Array.from(passPhrase));
    easyTransferMessage.setToaddress(Uint8Array.from(decode58Check(toAddress)));
    easyTransferMessage.setAmount(amount);
    const result = await this.api.easyTransfer(easyTransferMessage);
    return deserializeEasyTransfer(result);
  }
}

module.exports = GrpcClient;
