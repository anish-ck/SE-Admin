export const CERTIFICATE_REGISTRY_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "hash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "issuer",
                "type": "address"
            }
        ],
        "name": "CertificateStored",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "bytes32[]",
                "name": "hashes",
                "type": "bytes32[]"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "issuer",
                "type": "address"
            }
        ],
        "name": "CertificateBatchStored",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "authorizedIssuer",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "certificateExists",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "certificateIssuer",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "certificateTimestamp",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_newIssuer",
                "type": "address"
            }
        ],
        "name": "setAuthorizedIssuer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "_hash",
                "type": "bytes32"
            }
        ],
        "name": "storeCertificate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32[]",
                "name": "_hashes",
                "type": "bytes32[]"
            }
        ],
        "name": "storeCertificateBatch",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "_hash",
                "type": "bytes32"
            }
        ],
        "name": "verifyCertificate",
        "outputs": [
            {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "issuer",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const

export const CONTRACT_BYTECODE = "608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555033600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610c2c806100a16000396000f3fe608060405234801561001057600080fd5b506004361061009e5760003560e01c80638da5cb5b116100665780638da5cb5b14610163578063b38343461461018157806389d1f4e31461019f578063d816c7d5146101cf578063f2fde38b146101ff5761009e565b8063098e7d74146100a35780631ab1afb9146100d35780633f7e57bb14610103578063595b1a3e1461013357806369fe0e2d14610147575b600080fd5b6100bd60048036038101906100b89190610816565b61021b565b6040516100ca91906108b7565b60405180910390f35b6100ed60048036038101906100e89190610816565b610268565b6040516100fa919061093b565b60405180910390f35b61011d60048036038101906101189190610816565b6102a0565b60405161012a91906108b7565b60405180910390f35b61014d600480360381019061014891906109a6565b6102c0565b005b610161600480360381019061015c91906109ef565b6104d1565b005b61016b61059a565b604051610178919061093b565b60405180910390f35b6101896105be565b604051610196919061093b565b60405180910390f35b6101b960048036038101906101b49190610816565b6105e4565b6040516101c69190610a3b565b60405180910390f35b6101e960048036038101906101e49190610816565b610604565b6040516101f69190610a65565b60405180910390f35b610219600480360381019061021491906109ef565b610624565b005b60006002600083815260200190815260200160002060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050919050565b60006003600083815260200190815260200160002060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050919050565b60006004600083815260200190815260200160002054905091905050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16148061039d5750600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b6103dc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103d390610ae3565b60405180910390fd5b60004290506000805b83518110156104aa576002600085838151811061040557610404610b03565b5b6020026020010151815260200190815260200160002060009054906101000a900460ff1615610469576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161046090610b7e565b60405180910390fd5b60016002600086848151811061048257610481610b03565b5b6020026020010151815260200190815260200160002060006101000a81548160ff02191690831515021790555080806104ba90610bcd565b9150506103e5565b503373ffffffffffffffffffffffffffffffffffffffff167f9f8ddd1bf2c0c9f2b62f66af9e6e1c3b7c4b6dc47f9e5cf8e7d5dbf0b2b0b4a5848360405161050d929190610c15565b60405180910390a2505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16148061057f575033600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16145b61059157610590610b3e565b5b50565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60026020528060005260406000206000915054906101000a900460ff1681565b60046020528060005260406000206000915090505481565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146106ab576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016106a290610ae3565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff160361071a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161071190610b7e565b60405180910390fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a3806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b6000604051905090565b600080fd5b600080fd5b6000819050919050565b6107fe816107eb565b811461080957600080fd5b50565b60008135905061081b816107f5565b92915050565b600060208284031215610837576108366107e1565b5b60006108458482850161080c565b91505092915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006108798261084e565b9050919050565b6108898161086e565b82525050565b600060208201905081810360008301526108a98184610880565b905092915050565b60006020820190506108c66000830184610880565b92915050565b600081519050919050565b600082825260208201905092915050565b600081905092915050565b60006108fe826108cc565b61090881856108d7565b9350610918818560208601610888565b610921816108e8565b840191505092915050565b6000602082019050818103600083015261094681846108f3565b905092915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b600061097482610958565b9050919050565b610984816107eb565b811461098f57600080fd5b50565b6000813590506109a18161097b565b92915050565b6000602082840312156109bd576109bc6107e1565b5b60006109cb84828501610992565b91505092915050565b6109dd8161086e565b81146109e857600080fd5b50565b6000813590506109fa816109d4565b92915050565b600060208284031215610a1657610a156107e1565b5b6000610a24848285016109eb565b91505092915050565b60008115159050919050565b610a4281610a2d565b82525050565b6000602082019050610a5d6000830184610a39565b92915050565b6000602082019050610a786000830184610a80565b92915050565b6000819050919050565b610a9181610a7e565b82525050565b6000608082019050610aac6000830187610a39565b610ab96020830186610a88565b610ac66040830185610880565b610ad36060830184610880565b95945050505050565b60006020820190508181036000830152610af581610b9e565b9050919050565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052600160045260246000fd5b600082610b3857610b37610b58565b5b828206905092915050565b634e487b7160e01b600052601260045260246000fd5b634e487b7160e01b600052601260045260246000fd5b60006020820190508181036000830152610b8881610b9e565b9050919050565b60008190508160005260206000209050919050565b600081546108cc81610b8f565b600060208201905081810360008301526108a98184610bb1565b634e487b7160e01b600052601160045260246000fd5b6000610bee82610a7e565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203610c2057610c1f610bd5565b5b60018201905091905056fea2646970667358221220"
