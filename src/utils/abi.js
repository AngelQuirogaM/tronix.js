const { keccak256 } = require('js-sha3');
const { utils } = require('ethers');
const {decode58Check} = require('./crypto');
const {ADDRESS_PREFIX_REGEX} = require('./address');
const {byteArray2hexStr} = require('../lib/bytes');

// Parameter types
const ADDRESS_TYPE = "address";

function encode(method, parameters)
{
    return encodeMethod(method) + encodeParameters(method, parameters);
}

function decode(method, parameters)
{
    //TODO
}

function encodeMethod(method)
{
    const hashed = keccak256(method).toString();
    return hashed.substring(0,8);
}

function encodeParameters(method, parameters)
{
    const methodTypes = getMethodTypes(method);
    const parametersList = parameters.split(",");

    for(var i=0;i<methodTypes.length;i++)
    {
        if (methodTypes[i] == ADDRESS_TYPE)
        {
            parametersList[i] = byteArray2hexStr(decode58Check(parametersList[i])).toLowerCase().replace(ADDRESS_PREFIX_REGEX,'0x');
        }
    }

    return utils.defaultAbiCoder.encode(methodTypes,parametersList).substring(2);
}

function getMethodTypes(method)
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

module.exports = {
    encode,
    decode
}