use super::*;
use stylus_sdk::prelude::*;

// Define the NFT Factory storage
sol_storage! {
    #[entrypoint]
    pub struct NftFactory {
        address implementation;
        uint256 collection_count;
        mapping(uint256 => address) collections;
        mapping(address => address[]) creator_to_collections;
        mapping(address => uint256) collection_to_id;
    }
}

// ============================================
// NFT FACTORY IMPLEMENTATION
// ============================================

#[public]
impl NftFactory {
    /// Initialize the factory with an implementation contract address
    pub fn initialize(&mut self, implementation: Address) -> Result<(), Vec<u8>> {
        if self.implementation.get() != Address::ZERO {
            return Err(AlreadyInitialized {}.abi_encode());
        }
        
        if implementation == Address::ZERO {
            return Err(InvalidImplementation {}.abi_encode());
        }
        
        self.implementation.set(implementation);
        Ok(())
    }

    /// Creates a new NFT collection for the caller
    /// Each user can create their own collection with custom parameters
    pub fn create_collection(
        &mut self,
        name: String,
        symbol: String,
        base_uri: String,
    ) -> Result<Address, Vec<u8>> {
        let creator = self.vm().msg_sender();
        let implementation = self.implementation.get();
        
        if implementation == Address::ZERO {
            return Err(InvalidImplementation {}.abi_encode());
        }

        // Increment collection count
        let collection_id = self.collection_count.get();
        let new_collection_id = collection_id + U256::from(1);
        self.collection_count.set(new_collection_id);

        // Deploy new collection using CREATE2 for deterministic addresses
        // This creates a minimal proxy (EIP-1167) that delegates to the implementation
        let collection_address = self._deploy_clone(implementation, collection_id)?;
        
        // Initialize the newly deployed collection
        self._initialize_collection(collection_address, name.clone(), symbol.clone(), base_uri.clone(), creator)?;
        
        // Store collection mapping
        self.collections.setter(collection_id).set(collection_address);
        // Note: creator_to_collections would need proper dynamic array handling in production
        self.collection_to_id.setter(collection_address).set(collection_id);

        // Emit event
        log(self.vm(), CollectionCreated {
            creator,
            collection_address,
            name,
            symbol,
            base_uri,
            collection_id,
        });

        Ok(collection_address)
    }

    /// Returns the implementation contract address
    pub fn get_implementation(&self) -> Address {
        self.implementation.get()
    }

    /// Returns the total number of collections created
    pub fn get_collection_count(&self) -> U256 {
        self.collection_count.get()
    }

    /// Returns the collection address for a given collection ID
    pub fn get_collection_by_id(&self, collection_id: U256) -> Address {
        self.collections.get(collection_id)
    }

    /// Returns the collection ID for a given collection address
    pub fn get_collection_id(&self, collection_address: Address) -> U256 {
        self.collection_to_id.get(collection_address)
    }

    /// Returns all collections (paginated for gas efficiency)
    pub fn get_collections(&self, start: U256, count: U256) -> Vec<Address> {
        let mut collections = Vec::new();
        let total = self.collection_count.get();
        let end = if start + count > total { total } else { start + count };
        
        let mut i = start;
        while i < end {
            collections.push(self.collections.get(i));
            i = i + U256::from(1);
        }
        
        collections
    }

    // Internal function to deploy a minimal proxy (EIP-1167 clone)
    fn _deploy_clone(&mut self, implementation: Address, salt: U256) -> Result<Address, Vec<u8>> {
        // EIP-1167 minimal proxy bytecode
        // This bytecode creates a proxy that delegates all calls to the implementation
        let mut bytecode = vec![
            0x36, 0x3d, 0x3d, 0x37, 0x3d, 0x3d, 0x3d, 0x36, 0x3d, 0x73,
        ];
        bytecode.extend_from_slice(implementation.as_slice());
        bytecode.extend_from_slice(&[
            0x5a, 0xf4, 0x3d, 0x82, 0x80, 0x3e, 0x90, 0x3d, 0x91, 0x60,
            0x2b, 0x57, 0xfd, 0x5b, 0xf3,
        ]);

        // Use CREATE2 for deterministic address
        let salt_bytes = B256::from(salt.to_be_bytes::<32>());
        
        // Use vm() to deploy with CREATE2 (unsafe raw interface)
        let result_addr: Address;
        unsafe {
            let bytecode_ptr = bytecode.as_ptr();
            let bytecode_len = bytecode.len();
            let value_ptr = U256::ZERO.as_le_slice().as_ptr();
            let salt_ptr = salt_bytes.as_ptr();
            let mut addr_out = [0u8; 20];
            let mut addr_len = addr_out.len();
            
            self.vm().create2(
                bytecode_ptr,
                bytecode_len,
                value_ptr,
                salt_ptr,
                addr_out.as_mut_ptr(),
                &mut addr_len as *mut usize,
            );
            
            result_addr = Address::from_slice(&addr_out);
        }
        
        if result_addr == Address::ZERO {
            return Err(DeploymentFailed {}.abi_encode());
        }
        
        Ok(result_addr)
    }

    // Internal function to initialize a deployed collection
    fn _initialize_collection(
        &self,
        collection_address: Address,
        name: String,
        symbol: String,
        base_uri: String,
        creator: Address,
    ) -> Result<(), Vec<u8>> {
        // Define the initialize function interface
        sol! {
            function initialize(string name, string symbol, string baseUri, address creator);
        }
        
        // Encode the initialize call with all parameters
        let call_data = initializeCall {
            name,
            symbol,
            baseUri: base_uri,
            creator,
        }.abi_encode();
        
        let call = RawCall::new();
        
        unsafe {
            match call.call(collection_address, &call_data) {
                Ok(_) => Ok(()),
                Err(_) => Err(DeploymentFailed {}.abi_encode()),
            }
        }
    }
}
