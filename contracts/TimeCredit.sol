// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TimeCredit (TBC)
 * @notice Official ERC-20 token contract for TimeBank on Polygon Amoy Testnet (Chain ID: 80002).
 * 1 Time Credit (1 TBC) represents 1 hour of peer-to-peer expertise exchange or approved AICTE activity.
 */
contract TimeCredit {
    string public constant name = "TimeBank Credit";
    string public constant symbol = "TBC";
    uint8 public constant decimals = 18;

    uint256 private _totalSupply;
    address public owner;
    address public relayer;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    struct EscrowEntry {
        address client;
        address provider;
        uint256 amount;
        bool active;
        bool completed;
        bool refunded;
    }

    mapping(bytes32 => EscrowEntry) public escrows;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event EscrowCreated(bytes32 indexed escrowId, address indexed client, address indexed provider, uint256 amount);
    event EscrowReleased(bytes32 indexed escrowId, address indexed provider, uint256 amount);
    event EscrowRefunded(bytes32 indexed escrowId, address indexed client, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "TimeCredit: caller is not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || msg.sender == relayer, "TimeCredit: caller not authorized");
        _;
    }

    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer != address(0) ? _relayer : msg.sender;
        // Mint initial reserve to owner for platform liquidity (e.g. 10,000 TBC)
        _mint(owner, 10000 * 10**uint256(decimals));
    }

    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "TimeCredit: invalid relayer address");
        emit RelayerUpdated(relayer, _relayer);
        relayer = _relayer;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address _owner, address spender) external view returns (uint256) {
        return _allowances[_owner][spender];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "TimeCredit: transfer amount exceeds allowance");
        unchecked {
            _approve(from, msg.sender, currentAllowance - amount);
        }
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Mint starter credits, AICTE academic rewards, or referral credits.
     * Accessible by owner or platform gasless relayer.
     */
    function mint(address to, uint256 amount) external onlyAuthorized returns (bool) {
        _mint(to, amount);
        return true;
    }

    /**
     * @notice Burn credits from account.
     */
    function burn(address from, uint256 amount) external onlyAuthorized returns (bool) {
        _burn(from, amount);
        return true;
    }

    /**
     * @notice Relay transfer from client to provider sponsored by relayer.
     */
    function relayTransfer(address from, address to, uint256 amount) external onlyAuthorized returns (bool) {
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Locks credits in escrow during booking.
     */
    function createEscrow(bytes32 escrowId, address client, address provider, uint256 amount) external onlyAuthorized returns (bool) {
        require(escrows[escrowId].amount == 0, "TimeCredit: escrow already exists");
        require(_balances[client] >= amount, "TimeCredit: insufficient client balance for escrow");

        _transfer(client, address(this), amount);
        escrows[escrowId] = EscrowEntry({
            client: client,
            provider: provider,
            amount: amount,
            active: true,
            completed: false,
            refunded: false
        });

        emit EscrowCreated(escrowId, client, provider, amount);
        return true;
    }

    /**
     * @notice Releases locked escrow credits to provider upon successful service completion.
     */
    function releaseEscrow(bytes32 escrowId) external onlyAuthorized returns (bool) {
        EscrowEntry storage entry = escrows[escrowId];
        require(entry.active, "TimeCredit: escrow not active");
        require(!entry.completed && !entry.refunded, "TimeCredit: escrow finalized");

        entry.active = false;
        entry.completed = true;

        _transfer(address(this), entry.provider, entry.amount);
        emit EscrowReleased(escrowId, entry.provider, entry.amount);
        return true;
    }

    /**
     * @notice Refunds locked escrow credits back to client upon booking cancellation.
     */
    function refundEscrow(bytes32 escrowId) external onlyAuthorized returns (bool) {
        EscrowEntry storage entry = escrows[escrowId];
        require(entry.active, "TimeCredit: escrow not active");
        require(!entry.completed && !entry.refunded, "TimeCredit: escrow finalized");

        entry.active = false;
        entry.refunded = true;

        _transfer(address(this), entry.client, entry.amount);
        emit EscrowRefunded(escrowId, entry.client, entry.amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "TimeCredit: transfer from the zero address");
        require(to != address(0), "TimeCredit: transfer to the zero address");
        require(_balances[from] >= amount, "TimeCredit: transfer amount exceeds balance");

        unchecked {
            _balances[from] -= amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "TimeCredit: mint to the zero address");

        _totalSupply += amount;
        unchecked {
            _balances[account] += amount;
        }

        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "TimeCredit: burn from the zero address");
        require(_balances[account] >= amount, "TimeCredit: burn amount exceeds balance");

        unchecked {
            _balances[account] -= amount;
            _totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);
    }

    function _approve(address _owner, address spender, uint256 amount) internal {
        require(_owner != address(0), "TimeCredit: approve from the zero address");
        require(spender != address(0), "TimeCredit: approve to the zero address");

        _allowances[_owner][spender] = amount;
        emit Approval(_owner, spender, amount);
    }
}
