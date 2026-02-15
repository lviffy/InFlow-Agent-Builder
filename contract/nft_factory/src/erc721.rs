use super::*;
use stylus_sdk::prelude::*;

// Define the ERC721 NFT storage
sol_storage! {
    #[entrypoint]
    pub struct Erc721 {
        string name;
        string symbol;
        string base_uri;
        uint256 next_token_id;
        address creator;
        bool initialized;
        
        mapping(uint256 => address) owners;
        mapping(address => uint256) balances;
        mapping(uint256 => address) token_approvals;
        mapping(address => mapping(address => bool)) operator_approvals;
    }
}

// ============================================
// ERC721 COLLECTION IMPLEMENTATION
// ============================================

#[public]
impl Erc721 {
    /// Initializes an NFT collection (called by the factory)
    pub fn initialize(
        &mut self,
        name: String,
        symbol: String,
        base_uri: String,
        creator: Address,
    ) {
        // Only initialize once
        if self.initialized.get() {
            return;
        }

        self.name.set_str(&name);
        self.symbol.set_str(&symbol);
        self.base_uri.set_str(&base_uri);
        self.next_token_id.set(U256::from(1)); // Start token IDs from 1
        self.creator.set(creator);
        self.initialized.set(true);
    }

    /// Returns the creator of this collection
    pub fn creator(&self) -> Address {
        self.creator.get()
    }

    /// Returns the name of the NFT collection
    pub fn name(&self) -> String {
        self.name.get_string()
    }

    /// Returns the symbol of the NFT collection
    pub fn symbol(&self) -> String {
        self.symbol.get_string()
    }

    /// Returns the base URI for token metadata
    pub fn base_uri(&self) -> String {
        self.base_uri.get_string()
    }

    /// Returns the token URI for a given token ID
    pub fn token_uri(&self, token_id: U256) -> Result<String, Vec<u8>> {
        if !self._exists(token_id) {
            return Err(InvalidTokenId { token_id }.abi_encode());
        }
        
        let mut uri = self.base_uri.get_string();
        let id_str = token_id.to_string();
        uri.push_str(&id_str);
        Ok(uri)
    }

    /// Returns the total number of tokens minted
    pub fn total_supply(&self) -> U256 {
        let next_id = self.next_token_id.get();
        if next_id > U256::ZERO {
            next_id - U256::from(1)
        } else {
            U256::ZERO
        }
    }

    /// Returns the balance (number of NFTs) of an account
    pub fn balance_of(&self, owner: Address) -> U256 {
        self.balances.get(owner)
    }

    /// Returns the owner of a token
    pub fn owner_of(&self, token_id: U256) -> Result<Address, Vec<u8>> {
        let owner = self.owners.get(token_id);
        if owner == Address::ZERO {
            return Err(InvalidTokenId { token_id }.abi_encode());
        }
        Ok(owner)
    }

    /// Mints a new NFT to the specified address
    pub fn mint(&mut self, to: Address) -> Result<U256, Vec<u8>> {
        if to == Address::ZERO {
            return Err(MintToZeroAddress {}.abi_encode());
        }

        let token_id = self.next_token_id.get();
        self.next_token_id.set(token_id + U256::from(1));

        self.owners.setter(token_id).set(to);
        
        let balance = self.balances.get(to);
        self.balances.setter(to).set(balance + U256::from(1));

        log(self.vm(), Transfer {
            from: Address::ZERO,
            to,
            token_id,
        });

        Ok(token_id)
    }

    /// Burns (destroys) an NFT
    pub fn burn(&mut self, token_id: U256) -> Result<bool, Vec<u8>> {
        let owner = self.owner_of(token_id)?;
        let caller = self.vm().msg_sender();

        if !self._is_approved_or_owner(caller, token_id) {
            return Err(NotOwnerOrApproved { caller, token_id }.abi_encode());
        }

        // Clear approvals
        self.token_approvals.setter(token_id).set(Address::ZERO);

        // Update balances
        let balance = self.balances.get(owner);
        self.balances.setter(owner).set(balance - U256::from(1));

        // Remove owner
        self.owners.setter(token_id).set(Address::ZERO);

        log(self.vm(), Transfer {
            from: owner,
            to: Address::ZERO,
            token_id,
        });

        Ok(true)
    }

    /// Transfers an NFT from the caller to another address
    pub fn transfer_from(
        &mut self,
        from: Address,
        to: Address,
        token_id: U256,
    ) -> Result<bool, Vec<u8>> {
        let caller = self.vm().msg_sender();
        
        if !self._is_approved_or_owner(caller, token_id) {
            return Err(NotOwnerOrApproved { caller, token_id }.abi_encode());
        }

        self._transfer(from, to, token_id)?;
        Ok(true)
    }

    /// Safe transfer with data
    pub fn safe_transfer_from(
        &mut self,
        from: Address,
        to: Address,
        token_id: U256,
    ) -> Result<bool, Vec<u8>> {
        self.transfer_from(from, to, token_id)
    }

    /// Approves another address to transfer a specific token
    pub fn approve(&mut self, to: Address, token_id: U256) -> Result<bool, Vec<u8>> {
        let owner = self.owner_of(token_id)?;
        let caller = self.vm().msg_sender();

        if caller != owner && !self.is_approved_for_all(owner, caller) {
            return Err(NotOwner { caller, token_id }.abi_encode());
        }

        self.token_approvals.setter(token_id).set(to);

        log(self.vm(), Approval {
            owner,
            approved: to,
            token_id,
        });

        Ok(true)
    }

    /// Returns the approved address for a token
    pub fn get_approved(&self, token_id: U256) -> Result<Address, Vec<u8>> {
        if !self._exists(token_id) {
            return Err(InvalidTokenId { token_id }.abi_encode());
        }
        Ok(self.token_approvals.get(token_id))
    }

    /// Sets approval for all tokens to an operator
    pub fn set_approval_for_all(&mut self, operator: Address, approved: bool) -> Result<bool, Vec<u8>> {
        let owner = self.vm().msg_sender();
        self.operator_approvals.setter(owner).setter(operator).set(approved);

        log(self.vm(), ApprovalForAll {
            owner,
            operator,
            approved,
        });

        Ok(true)
    }

    /// Checks if an operator is approved for all tokens of an owner
    pub fn is_approved_for_all(&self, owner: Address, operator: Address) -> bool {
        self.operator_approvals.getter(owner).get(operator)
    }
}

// Internal helper functions
impl Erc721 {
    /// Checks if a token exists
    fn _exists(&self, token_id: U256) -> bool {
        self.owners.get(token_id) != Address::ZERO
    }

    /// Checks if the caller is the owner or approved for a token
    fn _is_approved_or_owner(&self, spender: Address, token_id: U256) -> bool {
        if !self._exists(token_id) {
            return false;
        }

        let owner = self.owners.get(token_id);
        
        if spender == owner {
            return true;
        }

        if self.token_approvals.get(token_id) == spender {
            return true;
        }

        if self.operator_approvals.getter(owner).get(spender) {
            return true;
        }

        false
    }

    /// Internal transfer function
    fn _transfer(&mut self, from: Address, to: Address, token_id: U256) -> Result<(), Vec<u8>> {
        if to == Address::ZERO {
            return Err(TransferToZeroAddress {}.abi_encode());
        }

        let owner = self.owner_of(token_id)?;
        if owner != from {
            return Err(NotOwner { caller: from, token_id }.abi_encode());
        }

        // Clear approvals
        self.token_approvals.setter(token_id).set(Address::ZERO);

        // Update balances
        let from_balance = self.balances.get(from);
        self.balances.setter(from).set(from_balance - U256::from(1));

        let to_balance = self.balances.get(to);
        self.balances.setter(to).set(to_balance + U256::from(1));

        // Transfer ownership
        self.owners.setter(token_id).set(to);

        log(self.vm(), Transfer { from, to, token_id });

        Ok(())
    }
}
