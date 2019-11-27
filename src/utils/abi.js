const { keccak256 } = require('js-sha3');
import {utils} from 'ethers';
import {address} from './address';
import {decode58Check} from "./crypto";

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
    const hashed = keccak256(selector).toString();
    return hashed.substring(0,4);
}

function encodeParameters(method, parameters)
{
    const methodTypes = getMethodTypes(method);
    for(var i=0;i<methodTypes.length;i++)
    {
        if (methodTypes[i] == ADDRESS_TYPE)
        {
            parameters[i] = Uint8Array.from(decode58Check("0x"+address.substring(1)));
        }
    }

    return utils.AbiCoder.encode(methodTypes,parameters);
}

function getMethodTypes(method)
{
    const start = method.indexOf("(");
    const end = method.indexOf(")");

    if (start + 1 < end)
    {
        let list = method.substring(start,end).split(",");
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