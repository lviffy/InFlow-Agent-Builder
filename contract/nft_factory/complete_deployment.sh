#!/bin/bash

# Complete deployment helper
# Usage: 
#   ./complete_deployment.sh new              -> Deploys everything from scratch
#   ./complete_deployment.sh <ADDRESS>        -> Completes deployment given one existing contract

RPC_URL="http://localhost:8547"
PRIVATE_KEY="0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659"
INPUT_ARG="${1:-new}"

echo "=========================================="
echo "NFT Factory Deployment Helper"
echo "=========================================="

deploy_template() {
    echo "--- Deploying ERC721 Template ---"
    echo "1. Configuring Cargo for ERC721 Template..."
    sed -i 's/default = \["mini-alloc"\]/default = ["mini-alloc", "erc721"]/' Cargo.toml
    sed -i 's/default = \["mini-alloc", "factory"\]/default = ["mini-alloc", "erc721"]/' Cargo.toml
    
    echo "2. Checking ERC721 Template..."
    cargo stylus check --endpoint=$RPC_URL

    echo "3. Deploying ERC721 Template..."
    DEPLOY_OUT=$(cargo stylus deploy --private-key=$PRIVATE_KEY --endpoint=$RPC_URL 2>&1)
    TEMPLATE_ADDR=$(echo "$DEPLOY_OUT" | grep -oP 'deployed code at address \K0x[a-fA-F0-9]{40}' | head -1)
    
    if [ -z "$TEMPLATE_ADDR" ]; then
        TEMPLATE_ADDR=$(echo "$DEPLOY_OUT" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)
    fi
    
    if [ -z "$TEMPLATE_ADDR" ]; then
        echo "❌ Failed to deploy Template"
        echo "$DEPLOY_OUT"
        sed -i 's/default = \["mini-alloc", "erc721"\]/default = ["mini-alloc"]/' Cargo.toml
        exit 1
    fi
    echo "✓ Template deployed at: $TEMPLATE_ADDR"
    
    echo "4. Exporting ERC721 ABI..."
    cargo stylus export-abi --json > erc721_abi.json
}

deploy_factory() {
    echo "--- Deploying NFT Factory ---"
    echo "1. Configuring Cargo for NFT Factory..."
    # Ensure we start from a clean state or switch from erc721
    sed -i 's/default = \["mini-alloc"\]/default = ["mini-alloc", "factory"]/' Cargo.toml
    sed -i 's/default = \["mini-alloc", "erc721"\]/default = ["mini-alloc", "factory"]/' Cargo.toml
    
    echo "2. Checking NFT Factory..."
    cargo stylus check --endpoint=$RPC_URL

    echo "3. Deploying NFT Factory..."
    DEPLOY_OUT=$(cargo stylus deploy --private-key=$PRIVATE_KEY --endpoint=$RPC_URL 2>&1)
    FACTORY_ADDR=$(echo "$DEPLOY_OUT" | grep -oP 'deployed code at address \K0x[a-fA-F0-9]{40}' | head -1)
    
    if [ -z "$FACTORY_ADDR" ]; then
        FACTORY_ADDR=$(echo "$DEPLOY_OUT" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)
    fi
    
    if [ -z "$FACTORY_ADDR" ]; then
        echo "❌ Failed to deploy Factory"
        echo "$DEPLOY_OUT"
        sed -i 's/default = \["mini-alloc", "factory"\]/default = ["mini-alloc"]/' Cargo.toml
        exit 1
    fi
    echo "✓ Factory deployed at: $FACTORY_ADDR"

    echo "4. Exporting NFT Factory ABI..."
    cargo stylus export-abi --json > nft_factory_abi.json
}

if [ "$INPUT_ARG" == "new" ]; then
    echo "Starting FRESH deployment of both contracts..."
    echo ""
    
    deploy_template
    deploy_factory
    
    # Restore Cargo
    sed -i 's/default = \["mini-alloc", "factory"\]/default = ["mini-alloc"]/' Cargo.toml

else
    EXISTING_ADDR=$INPUT_ARG
    echo "Existing Contract: $EXISTING_ADDR"
    echo ""

    # Check which contract was deployed
    echo "Checking contract type..."
    COLLECTION_COUNT=$(cast call --rpc-url $RPC_URL $EXISTING_ADDR "getCollectionCount()(uint256)" 2>&1)

    if [[ $COLLECTION_COUNT =~ ^[0-9]+$ ]]; then
        echo "✓ Detected: NFT Factory (already deployed)"
        echo "  Need to deploy: ERC721 Template"
        echo ""
        FACTORY_ADDR=$EXISTING_ADDR
        deploy_template
        # Restore Cargo
        sed -i 's/default = \["mini-alloc", "erc721"\]/default = ["mini-alloc"]/' Cargo.toml
    else
        echo "✓ Detected: ERC721 Template (already deployed)"
        echo "  Need to deploy: NFT Factory"
        echo ""
        TEMPLATE_ADDR=$EXISTING_ADDR
        deploy_factory
        # Restore Cargo
        sed -i 's/default = \["mini-alloc", "factory"\]/default = ["mini-alloc"]/' Cargo.toml
    fi
fi

echo ""
echo "--- Initializing Factory ---"
echo "Factory:  $FACTORY_ADDR"
echo "Template: $TEMPLATE_ADDR"

INIT_OUT=$(cast send --rpc-url $RPC_URL --private-key $PRIVATE_KEY \
    $FACTORY_ADDR "initialize(address)" $TEMPLATE_ADDR 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Factory initialized successfully!"
else
    echo "⚠️  Initialization output:"
    echo "$INIT_OUT"
fi

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="
echo "Factory Address:  $FACTORY_ADDR"
echo "Template Address: $TEMPLATE_ADDR"
echo ""
echo "Run tests with:"
echo "./test_nft_factory.sh $FACTORY_ADDR"
