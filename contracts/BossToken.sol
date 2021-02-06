pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BossToken is ERC20 {

    // Decimals are set to 18 by default in `ERC20`
    constructor() public ERC20("BossToken", "BOSS") {
        _mint(msg.sender, 2**256 - 1);
    }
}