import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { BglPathValidator } from "../target/types/bgl_path_validator";
import { keccak_256 } from "@noble/hashes/sha3";
import { assert } from "chai";

describe("bgl-path-validator", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.BglPathValidator as Program<BglPathValidator>;

  const TREASURY = new anchor.web3.PublicKey("patht4uEaSDieLqjU4EZ8PZRWs2dPCQMqorCTZhVPMB");

  const BAD_PROOF = [0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0];
  const GOOD_PATH = [0, 0, 0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7,
    0, 8, 0, 9, 0, 10, 0, 11, 0, 12, 0, 13, 0, 14, 0, 15,
    0, 16, 0, 17, 0, 18, 0, 19, 0, 20, 0, 21, 0, 22, 0, 23,
    0, 24, 0, 25, 0, 26, 0, 27, 0, 28, 0, 29, 0, 30, 0, 31,
    0, 32, 0, 33, 0, 34, 0, 35, 0, 36, 0, 37, 0, 38, 0, 39,
    0, 40, 0, 41, 0, 42, 0, 43, 0, 44, 0, 45, 0, 46, 0, 47,
    0, 48, 0, 49, 0, 50, 0, 51, 0, 52, 0, 53, 0, 54, 0, 55,
    0, 56, 0, 57, 0, 58, 0, 59, 0, 60, 0, 61, 0, 62, 0, 63];
  const BAD_PATH = [0, 0, 0, 2, 0, 4, 0, 6, 0, 8, 0, 10, 0, 12, 0, 14,
    0, 16, 0, 18, 0, 20, 0, 22, 0, 24, 0, 26, 0, 28, 0, 30,
    0, 32, 0, 34, 0, 36, 0, 38, 0, 40, 0, 42, 0, 44, 0, 46];

  it("Speed and Proof correct!", async () => {
    const payer = anchor.web3.Keypair.generate();
    let airdrop = await anchor.getProvider().connection.requestAirdrop(payer.publicKey, 10000000000);
    await confirmTransaction(airdrop, "finalized");

    const proof = hashPath(GOOD_PATH);
    // console.log("Path hash:", proof);

    const tx = await program.methods
      .validateU8({ proof: Array.from(proof), path: Buffer.from(GOOD_PATH) })
      .accounts({
        payer: payer.publicKey,
        treasury: TREASURY,
      })
      .signers([payer])
      .rpc({ skipPreflight: true });
  });

  it("Speed correct but wrong Proof!", async () => {
    const payer = anchor.web3.Keypair.generate();
    let airdrop = await anchor.getProvider().connection.requestAirdrop(payer.publicKey, 10000000000);
    await confirmTransaction(airdrop, "finalized");

    // console.log("Path hash:", BAD_PROOF);

    try {
      const tx = await program.methods
        .validateU8({ proof: Array.from(BAD_PROOF), path: Buffer.from(GOOD_PATH) })
        .accounts({
          payer: payer.publicKey,
          treasury: TREASURY,
        })
        .signers([payer])
        .rpc({ skipPreflight: true });
    } catch (e) {
      assert.equal(e.code, 6000);
    }
  });

  it("Wrong Speed and Proof correct!", async () => {
    const payer = anchor.web3.Keypair.generate();
    let airdrop = await anchor.getProvider().connection.requestAirdrop(payer.publicKey, 10000000000);
    await confirmTransaction(airdrop, "finalized");

    const proof = hashPath(BAD_PATH);
    // console.log("Path hash:", proof);

    try {
      const tx = await program.methods
        .validateU8({ proof: Array.from(proof), path: Buffer.from(BAD_PATH) })
        .accounts({
          payer: payer.publicKey,
          treasury: TREASURY,
        })
        .signers([payer])
        .rpc({ skipPreflight: true });
    } catch (e) {
      assert.equal(e.code, 6001);
    }
  });

  it("Wrong Speed and Proof!", async () => {
    const payer = anchor.web3.Keypair.generate();
    let airdrop = await anchor.getProvider().connection.requestAirdrop(payer.publicKey, 10000000000);
    await confirmTransaction(airdrop, "finalized");

    // console.log("Path hash:", BAD_PROOF);

    try {
      const tx = await program.methods
        .validateU8({ proof: Array.from(BAD_PROOF), path: Buffer.from(BAD_PATH) })
        .accounts({
          payer: payer.publicKey,
          treasury: TREASURY,
        })
        .signers([payer])
        .rpc({ skipPreflight: true });
    } catch (e) {
      assert.equal(e.code, 6002);
    }
  });
});

async function confirmTransaction(signature: anchor.web3.TransactionSignature, commitment?: anchor.web3.Commitment) {
  const latestBlockHash = await anchor.getProvider().connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction({
    signature,
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  }, commitment || "confirmed");
}

function hashPath(path: number[]) {
  let computedHash: Uint8Array | null = null;
  for (let i = 0; i < path.length; i += 32) {
    const chunk = path.slice(i, i + 32);
    if (computedHash == null) {
      computedHash = keccak_256(Uint8Array.from([1].concat(chunk)))
    } else {
      computedHash = keccak_256(Uint8Array.from([1].concat(Array.from(computedHash)).concat(chunk)))
    }
  }
  return computedHash;
}