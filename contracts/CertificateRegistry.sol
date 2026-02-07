    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.19;

    /**
    * @title CertificateRegistry
    * @notice A simple contract to store and verify certificate hashes on Polygon
    * @dev Stores certificate hashes with metadata for verification
    */
    contract CertificateRegistry {
        address public owner;
        address public authorizedIssuer;

        // Mapping from certificate hash to existence
        mapping(bytes32 => bool) public certificateExists;

        // Mapping from certificate hash to timestamp
        mapping(bytes32 => uint256) public certificateTimestamp;

        // Mapping from certificate hash to issuer address
        mapping(bytes32 => address) public certificateIssuer;

        // Events
        event CertificateStored(
            bytes32 indexed hash,
            uint256 timestamp,
            address indexed issuer
        );
        event CertificateBatchStored(
            bytes32[] hashes,
            uint256 timestamp,
            address indexed issuer
        );
        event IssuerUpdated(address indexed oldIssuer, address indexed newIssuer);
        event OwnershipTransferred(
            address indexed previousOwner,
            address indexed newOwner
        );

        modifier onlyOwner() {
            require(msg.sender == owner, "Only owner can call this function");
            _;
        }

        modifier onlyAuthorized() {
            require(
                msg.sender == owner || msg.sender == authorizedIssuer,
                "Only owner or authorized issuer can call this function"
            );
            _;
        }

        constructor() {
            owner = msg.sender;
            authorizedIssuer = msg.sender;
        }

        /**
        * @notice Store a single certificate hash
        * @param _hash The SHA-256 hash of the certificate payload
        */
        function storeCertificate(bytes32 _hash) external onlyAuthorized {
            require(!certificateExists[_hash], "Certificate already exists");

            certificateExists[_hash] = true;
            certificateTimestamp[_hash] = block.timestamp;
            certificateIssuer[_hash] = msg.sender;

            emit CertificateStored(_hash, block.timestamp, msg.sender);
        }

        /**
        * @notice Store multiple certificate hashes in a single transaction
        * @param _hashes Array of SHA-256 hashes
        */
        function storeCertificateBatch(
            bytes32[] calldata _hashes
        ) external onlyAuthorized {
            uint256 timestamp = block.timestamp;

            for (uint256 i = 0; i < _hashes.length; i++) {
                require(
                    !certificateExists[_hashes[i]],
                    "Certificate already exists"
                );

                certificateExists[_hashes[i]] = true;
                certificateTimestamp[_hashes[i]] = timestamp;
                certificateIssuer[_hashes[i]] = msg.sender;
            }

            emit CertificateBatchStored(_hashes, timestamp, msg.sender);
        }

        /**
        * @notice Verify if a certificate hash exists on chain
        * @param _hash The hash to verify
        * @return exists Whether the certificate exists
        * @return timestamp When the certificate was stored (0 if not exists)
        * @return issuer Who stored the certificate (address(0) if not exists)
        */
        function verifyCertificate(
            bytes32 _hash
        ) external view returns (bool exists, uint256 timestamp, address issuer) {
            exists = certificateExists[_hash];
            timestamp = certificateTimestamp[_hash];
            issuer = certificateIssuer[_hash];
        }

        /**
        * @notice Update the authorized issuer address
        * @param _newIssuer The new issuer address
        */
        function setAuthorizedIssuer(address _newIssuer) external onlyOwner {
            require(_newIssuer != address(0), "Invalid address");
            address oldIssuer = authorizedIssuer;
            authorizedIssuer = _newIssuer;
            emit IssuerUpdated(oldIssuer, _newIssuer);
        }

        /**
        * @notice Transfer ownership of the contract
        * @param _newOwner The new owner address
        */
        function transferOwnership(address _newOwner) external onlyOwner {
            require(_newOwner != address(0), "Invalid address");
            address oldOwner = owner;
            owner = _newOwner;
            emit OwnershipTransferred(oldOwner, _newOwner);
        }
    }
