const { assert, expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe(" Testing BlockHole NFT MArketplace ", function () {
  let NFTMarketplace, nftmarketplace, owner, account1, account2;
  // deploying before each function
  beforeEach(async function () {
    NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    nftmarketplace = await NFTMarketplace.deploy();
    await nftmarketplace.deployed();
    [owner, account1, account2] = await ethers.getSigners();
  });

  // deployment address
  it("Contract deployed at : ", async function () {
    console.log("Deployment address : ", nftmarketplace.address);
  });

  // getting name and symbol of the marketplace token
  it("Should get the Name and Symbol of the marketplace token :", async function () {
    console.log("Name of token :", await nftmarketplace.name());
    console.log("Symbol of token :", await nftmarketplace.symbol());
  });

  // getting listing price., updating listing price and checking their status
  it("Should get the listing price ", async function () {
    const listingPrice = BigNumber.from(await nftmarketplace.getlistingFee());
    const testListingPrice = BigNumber.from(ethers.utils.parseEther("0.01"));
    assert.equal(
      ethers.utils.formatEther(listingPrice),
      ethers.utils.formatEther(testListingPrice)
    );
    console.log("Listing Price : ", ethers.utils.formatEther(listingPrice));
  });

  // updating listing price
  it("Should update the listing price ", async function () {
    const updatedListingPrice = ethers.utils.parseEther("0.1");
    await nftmarketplace.updatelistingFee(updatedListingPrice);
    const listingPrice = await nftmarketplace.getlistingFee();
    assert.equal(
      ethers.utils.formatEther(updatedListingPrice),
      ethers.utils.formatEther(listingPrice)
    );
    console.log(
      "Updated listing price : ",
      ethers.utils.formatEther(listingPrice)
    );

    //checking for event emit
    await expect(nftmarketplace.updatelistingFee(updatedListingPrice))
      .to.emit(nftmarketplace, "ListingChargeUpdated")
      .withArgs("Listing Charge Updated", updatedListingPrice);
  });

  // only owner can update listing price
  it("Only owner can update listing price ", async function () {
    const updatedListingPrice = ethers.utils.parseEther("0.1");
    await expect(
      nftmarketplace.connect(account1).updatelistingFee(updatedListingPrice)
    ).to.be.revertedWith(
      "only owner of the marketplace can perform this action"
    );
  });

  //testing NFT creation
  describe("should test NFT creation", function () {
    //checking royalty condition requirement
    it("Royalty should be less than equal to 10 ", async function () {
      await expect(nftmarketplace.createNFT("abc", 11)).to.be.revertedWith(
        "Royalty should be less than 10%"
      );
    });

    // checking the create NFT event
    it("Check for event emitted after NFT creation ", async function () {
      await expect(nftmarketplace.createNFT("abc", 6))
        .to.emit(nftmarketplace, "createdNFT")
        .withArgs(1, owner.address, 6);
    });

    //checking other arguments related to nft creation
    it("checking arguments related to NFT creation ", async function () {
      const txNftCreation = await nftmarketplace.createNFT("abc", 6);
      const nftCreationStatus = await txNftCreation.wait();
      console.log("Event emitted : ", await nftCreationStatus.events[1].event);
      console.log(
        "Token ID : ",
        await nftCreationStatus.events[0].args.tokenId.toString()
      );
    });
  });

  describe("Checking if seller listed NFT or not ", function () {
    beforeEach("Creating NFT token ", async function () {
      await nftmarketplace.connect(account1).createNFT("abc", 10);
      await nftmarketplace.createNFT("def", 7);
      await nftmarketplace.createNFT("ghi", 8);
      await nftmarketplace.createNFT("jkl", 9);
      await nftmarketplace.createNFT("mno", 6);
      await nftmarketplace.createNFT("pqr", 5);
    });
    //checking price to be greater than 0
    it("Should check price to be more than 0 ", async function () {
      await expect(nftmarketplace.listNFT(1, 0)).to.be.revertedWith(
        "Price cannot be 0"
      );
    });

    // checking if listing fee is passed or not
    it("Is listing fee passed or not ", async function () {
      await expect(
        nftmarketplace.listNFT(1, ethers.utils.parseEther("0.1"), {
          value: ethers.utils.parseEther("0.001"),
        })
      ).to.be.revertedWith("Must be equal to listing price");
    });

    //checking that only owner can list NFT
    it("Only owner is allowed to list the NFT ", async function () {
      await expect(
        nftmarketplace
          .connect(account2)
          .listNFT(1, ethers.utils.parseEther("0.1"), {
            value: ethers.utils.parseEther("0.01"),
          })
      ).to.be.revertedWith("Only the owner of nft can sell his nft");
    });

    it("Should check the status of arguments after listing NFT by seller ", async function () {
      const listNftTx = await nftmarketplace
        .connect(account1)
        .listNFT(1, ethers.utils.parseEther("0.2"), {
          value: ethers.utils.parseEther("0.01"),
        });
      const listNftStatus = await listNftTx.wait();
      console.log(
        "Status of list NFT function ",
        listNftStatus.events[1].args.sold
      );
      expect(listNftStatus.events[1].args.sold).to.be.equal(false);


    });

    //getting the balance in the NFT smart contract
    describe("Getting the balance in the NFT Marketplace contract : ", function () {
      it("Should get the Balance of the marketplace ", async function () {
        await nftmarketplace.listNFT(2, ethers.utils.parseEther("2"), {
          value: ethers.utils.parseEther("0.01"),
        });
        await nftmarketplace.listNFT(3, ethers.utils.parseEther("2"), {
          value: ethers.utils.parseEther("0.01"),
        });


        // Fetching NFT creator 
         console.log("NFT creator address : ", await nftmarketplace.fetchCreatorNft(2));
        
        // Fetching royality percentage from fetchRoyaltyPercentofNft function
         console.log("Royality of NFT with token id 2  : ",  (await nftmarketplace.fetchRoyaltyPercentofNft(2)).toString());

        // checking contractBalance function
        const marketplaceContractBalance =
          await nftmarketplace.contractBalance();
        console.log(
          "NFT Marketplace contract balance : ",
          ethers.utils.formatEther(marketplaceContractBalance)
        );

        // checking withdrawListingCommission function
        const withdrewCommission =
          await nftmarketplace.withdrawListingCommission();
        const withdrewCommissionStatus = await withdrewCommission.wait();
        console.log(
          "Status of commission withdrawn : ",
          ethers.utils.formatEther(
            withdrewCommissionStatus.events[0].args.balance
          )
        );
      });

      // only owner can withdraw commission
      it("Should check that only owner can withdraw commission in withdrawListingCommission function  ", async function () {
        await expect(
          nftmarketplace.connect(account1).withdrawListingCommission()
        ).to.be.revertedWith(
          "only owner of the marketplace can perform this action"
        );
      });

      
      // balance should be more than 0 to withdraw listing price
      it("Amount should be more than 0 to withdraw ", async function () {
        expect(nftmarketplace.withdrawListingCommission()).to.be.rejectedWith(
          "Zero balance in the account."
        );
      });
    });


    describe("Testing ", function(){
        it("Get all unsold NFTs ", async function(){
        
          await nftmarketplace.listNFT(2, ethers.utils.parseEther("2"), {
            value: ethers.utils.parseEther("0.01"),
          });
          await nftmarketplace.listNFT(3, ethers.utils.parseEther("2"), {
            value: ethers.utils.parseEther("0.01"),
          });
          await nftmarketplace.listNFT(4, ethers.utils.parseEther("0.4"), {
            value: ethers.utils.parseEther("0.01"),
          });
          await nftmarketplace.listNFT(5, ethers.utils.parseEther("0.7"), {
            value: ethers.utils.parseEther("0.01"),
          });

         await nftmarketplace.buyNFT(2, {value: ethers.utils.parseEther('2')});
          await nftmarketplace.buyNFT(3, {value: ethers.utils.parseEther('2')});


          // checking fetchAllUnsoldNFTs function
          const unsoldNFTs =  await nftmarketplace.fetchAllUnsoldNFTs();
          console.log("Unsold NFTS : ",  await unsoldNFTs.length);
          var i ;
          for(i=0; i< unsoldNFTs.length; i++){
            console.log("Unsold NFT token id -", (unsoldNFTs[i].tokenId.toString()));
          }

          //checking fetchMyNFTs function
          const fetchMyNFT = await nftmarketplace.fetchMyNFTs();
          console.log("Total number of my NFT : ", await fetchMyNFT.length);
          for( var i =0; i< fetchMyNFT.length; i++){
            console.log("My NFT Token Id :", ( await fetchMyNFT[i].tokenId.toString()));
          }


          //checking fetchMyListedNFTs function
          const myListedNft =  await nftmarketplace.fetchMyListedNFTs();
          console.log("My Listed NFTs : ", await myListedNft.length);
          for(var i=0 ; i<myListedNft.length ; i++)
          {
            console.log("My Listed Nft Token ids : ",( myListedNft[i].tokenId).toString());
          }


          
        });


        
    });

    describe(" Testing update listing price ", function () {
      it("Checking updateNftPrice function ", async function () {
        await nftmarketplace.listNFT(3, ethers.utils.parseEther("0.4"), {
          value: ethers.utils.parseEther("0.01"),
        });
        await expect(
          nftmarketplace
            .connect(account1)
            .updateNftPrice(3, ethers.utils.parseEther("0.5"))
        ).to.be.revertedWith("Only the seller can update price of NFT");
      });
    });
  });

  // checking cancelListing function
  describe(" Testing cancelListing function ", function () {
    it("Should check only seller can cancel the listing ", async function () {
      await nftmarketplace.createNFT("abc", 8);
      await nftmarketplace.listNFT(1, ethers.utils.parseEther("1"), {
        value: ethers.utils.parseEther("0.01"),
      });
      const cancelListingToken = await nftmarketplace.cancelListing(1);
      const cancelListingTokenStatus = await cancelListingToken.wait();

      //only seller can cancel token listing
      await expect(
        nftmarketplace.connect(account1).cancelListing(1)
      ).to.be.rejectedWith("Only the seller can cancel the listing");

      // getting the token id of NFT delisted
      console.log(
        "Token Id from event logs : ",
        cancelListingTokenStatus.events[0].args.tokenId.toString()
      );

      //seller should be the owner of the NFT
      await expect(cancelListingTokenStatus.events[1].args.seller).to.be.equal(
        cancelListingTokenStatus.events[1].args.owner
      );

      //displaying event name
      console.log(
        "Event emitted on calling cancelListing function : ",
        cancelListingTokenStatus.events[1].event
      );
    });
  });

  //checking buyNFT function
  describe("Should check buyNFT function ", function () {
    it("Price sent should be equal to the price of the token ", async function () {
      await nftmarketplace.createNFT("abc", 8);
      await nftmarketplace.createNFT("sef", 9);
      await nftmarketplace.listNFT(1, ethers.utils.parseEther("2"), {
        value: ethers.utils.parseEther("0.01"),
      });
      await nftmarketplace.listNFT(2, ethers.utils.parseEther("0.5"), {
        value: ethers.utils.parseEther("0.01"),
      });
      await expect(
        nftmarketplace.buyNFT(2, { value: ethers.utils.parseEther("0.4") })
      ).to.be.revertedWith("value is not equal to nft purchase price");
      const buyNftTransaction = await nftmarketplace.buyNFT(1, {
        value: ethers.utils.parseEther("2"),
      });
      const buyNftTransactionStatus = await buyNftTransaction.wait();
      console.log(
        "Status of buyNFT function : ",
        buyNftTransactionStatus.events[1].args.tokenId.toString()
      );
      console.log(
        "Event triggered after token brought : ",
        buyNftTransactionStatus.events[1].event
      );
    });
  });
});
