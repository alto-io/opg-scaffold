import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from "fs";
import path from "path";

const TOKENS_PATH = path.join(__dirname, "./tokenList.json");
export const MERKLE_TREE_PATH = path.join(__dirname, "./merkleTree.json");

export interface TokensData {
    ids: string[];
    amounts: string[];
}

export default class MerkleGenerator {
    public readonly merkleRoot: string;
    public readonly merkleTree: StandardMerkleTree<any>;

    constructor(tokensPath: string = TOKENS_PATH) {
        this.merkleTree = this.generateTree(tokensPath);
        this.merkleRoot = this.merkleTree.root;
        console.info("Merkle tree generated and saved to: ", MERKLE_TREE_PATH);
    }

    private generateTree(tokensPath: string): StandardMerkleTree<any[]> {
        const merkleData = JSON.parse(fs.readFileSync(tokensPath).toString());
        const tree = StandardMerkleTree.of(merkleData, ["address", "uint256", "uint256"]);
        fs.writeFileSync(MERKLE_TREE_PATH, JSON.stringify({root: tree.root, tree: tree.dump()}));
        return tree;
    }

    getTokens(address: string): TokensData {
        const tokens: TokensData = {ids: [], amounts: []};

        for (const [, entry] of this.merkleTree.entries()) {
          if (entry[0] === address) {
            tokens.ids.push(entry[1]);
            tokens.amounts.push(entry[2]);
          }
        }
        return tokens;
    }

    generateProof(address: string): string[][] {
        const proofs: string[][] = [];

        for (const [i, entry] of this.merkleTree.entries()) {
          if (entry[0] === address) {
            const proof = this.merkleTree.getProof(i);
            proofs.push(proof);
          }
        }
        return proofs;
    }
}