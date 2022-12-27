// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IERC721 {
  function safeTransferFrom(address from, address to, uint tokenId) external;

  function transferFrom(address, address, uint) external;
}

contract EnglishAuction {
  // events
  event Start();
  event Bid(address indexed sender, uint amount);
  event Withdraw(address indexed bidder, uint amount);
  event End(address winner, uint amount);

  IERC721 public nft;
  uint public nftId;

  address payable public seller;
  uint public endAt; //0
  bool public started; // default value false
  bool public ended; //default value false

  address public highestBidder; //0*00000
  uint public highestBid; // 0

  //address is mapped to bid amount
  mapping(address => uint) public bids;

  // constructor takes nft token address, token id, starting bitd amount
  constructor(address _nft, uint _nftId, uint _startingBid) {
    nft = IERC721(_nft); // address
    nftId = _nftId; //id

    seller = payable(msg.sender); //seller who owns the NFT
    highestBid = _startingBid; // assigning highest bid
  }

  // function to start the auction
  function start() external {
    require(!started, "started"); // started = false
    require(msg.sender == seller, "not seller");

    nft.transferFrom(msg.sender, address(this), nftId);
    started = true;
    endAt = block.timestamp + 7 days;

    emit Start();
  }

  function bid() external payable {
    require(started, "not started");
    require(block.timestamp < endAt, "ended");
    require(msg.value > highestBid, "value < highest");

    if (highestBidder != address(0)) {
      bids[highestBidder] += highestBid;
    }
    highestBidder = msg.sender;
    highestBid = msg.value;
    emit Bid(msg.sender, msg.value);
  }

  function withdraw() external {
    uint bal = bids[msg.sender];
    bids[msg.sender] = 0;
    payable(msg.sender).transfer(bal);

    emit Withdraw(msg.sender, bal);
  }

  function end() external {
    require(started, "not started");
    require(block.timestamp >= endAt, "not ended");
    require(!ended, "ended");

    ended = true;
    if (highestBidder != address(0)) {
      nft.safeTransferFrom(address(this), highestBidder, nftId);
      seller.transfer(highestBid);
    } else {
      nft.safeTransferFrom(address(this), seller, nftId);
    }

    emit End(highestBidder, highestBid);
  }
}
