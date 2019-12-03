const { keccak256 } = require('js-sha3');
const { utils } = require('ethers');
const { base64DecodeFromString, hexStr2byteArray, base64EncodeToString, stringToBytes } = require('../lib/code');
const {decode58Check, getBase58CheckAddress} = require('./crypto');
const { encode58 } = require('../lib/base58');
const {ADDRESS_PREFIX, ADDRESS_PREFIX_REGEX} = require('./address');
const {byteArray2hexStr} = require('../lib/bytes');

// Known abi method ids, function -> return
const METHODS = 
{
    //TRC20 https://github.com/tronprotocol/tron-contracts/blob/master/contracts/tokens/TRC20/TRC20.sol
    "totalSupply()" : "(uint256)",
    "balanceOf(address)" : "(uint256)",
    "allowance(address,address)" :"(uint256)",
    "transfer(address,uint256)" : "(bool)",
    "approve(address,uint256 value)" : "(bool)",
    "transferFrom(address,address,uint256)" : "(bool)",
    "increaseAllowance(address,uint256)" : "(bool)",
    "decreaseAllowance(address,uint256)" : "(bool)",
}

//dynamically added by the methods
let METHOD_IDS = {}

// Parameter types
const ADDRESS_TYPE = "address";

function initializeMethodIds()
{
    for (var key of Object.keys(METHODS))
    {
        METHOD_IDS[encodeMethod(key)] = {
            function: key,
            return: METHODS[key]
        };
    }
}

function encodeAbi(method, parameters)
{
    return encodeMethod(method) + encodeParameters(method, parameters);
}

function decodeAbiParams(input , method = undefined)
{
    if (method == undefined)
    {
        if (METHOD_IDS[input.substring(0,8)] == undefined) return input;
        method = METHOD_IDS[input.substring(0,8)].function;
    }

    const functionTypes = getTypes(method);
    const decoded = utils.defaultAbiCoder.decode(functionTypes, '0x'+input.substring(8));

    for(var i=0;i<functionTypes.length;i++)
    {
        if (functionTypes[i] == ADDRESS_TYPE)
        {
            decoded[i] = getBase58CheckAddress(hexStr2byteArray(ADDRESS_PREFIX + decoded[i].substring(2)));
        }
        else if (decoded[i]._ethersType == "BigNumber")
        {
            decoded[i] = decoded[i].toString();
        }
    }

    return decoded;
}

function decodeAbiResult(results, input, method = undefined)
{
    if (method == undefined)
    {
        if (METHOD_IDS[input.substring(0,8)] == undefined) return input;
        method = METHOD_IDS[input.substring(0,8)].return;
    }

    const resultTypes = getTypes(method);

    for(var i=0;i<results.length;i++)
    {
        results[i] = '0x'+results[i];
    }
    const decoded = [results.length];

    for(var i=0;i<resultTypes.length;i++)
    {
        if (results.length > i)
        {
            decoded[i] = utils.defaultAbiCoder.decode([resultTypes[i]], results[i])[0];
            if (resultTypes[i] == ADDRESS_TYPE)
            {
                decoded[i] = getBase58CheckAddress(hexStr2byteArray(ADDRESS_PREFIX + decoded[i].substring(2)));
            }
            else if (decoded[i]._ethersType == "BigNumber")
            {
                decoded[i] = decoded[i].toString();
            }
        }
    }

    return decoded;
}

function encodeMethod(method)
{
    const hashed = keccak256(method).toString();
    return hashed.substring(0,8);
}

function encodeParameters(method, parameters)
{
    const methodTypes = getTypes(method);

    for(var i=0;i<methodTypes.length;i++)
    {
        if (methodTypes[i] == ADDRESS_TYPE)
        {
            parameters[i] = byteArray2hexStr(decode58Check(parameters[i])).toLowerCase().replace(ADDRESS_PREFIX_REGEX,'0x');
        }
    }

    return utils.defaultAbiCoder.encode(methodTypes,parameters).substring(2);
}

function getTypes(method)
{
    const start = method.indexOf("(");
    const end = method.indexOf(")");

    if (start + 1 < end)
    {
        let list = method.substring(start+1,end).split(",");
        return list;
    }
    else
    {
        return [];
    }
}

initializeMethodIds();

module.exports = {
    encodeAbi,
    decodeAbiParams,
    decodeAbiResult
}