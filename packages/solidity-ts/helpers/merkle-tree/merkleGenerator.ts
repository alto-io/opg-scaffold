import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from "fs";
import path from "path";

export interface MerkleInput {
    solidityTypes: string[];
    data: any[];
}

export interface MerklePaths {
    inputTokens: string;
    outputMerkleTree: string;
}

export const itemsMerklePaths: MerklePaths = {
    // inputTokens: path.join(__dirname, "./dataV1/ownedItems.json"),
    // outputMerkleTree: path.join(__dirname, "./dataV1/itemsMerkleTree.json")
    inputTokens: path.join(__dirname, "./arcadiaMocks/ownedItems.json"),
    outputMerkleTree: path.join(__dirname, "./arcadiaMocks/itemsMerkleTree.json")
}
export const arcadiansMerklePaths: MerklePaths = {
    // inputTokens: path.join(__dirname, "./dataV1/ownedArcadians.json"),
    // outputMerkleTree: path.join(__dirname, "./dataV1/arcadiansMerkleTree.json")
    inputTokens: path.join(__dirname, "./arcadiaMocks/ownedArcadians.json"),
    outputMerkleTree: path.join(__dirname, "./arcadiaMocks/arcadiansMerkleTree.json")
}

export default class MerkleGenerator {
    public readonly merkleRoot: string;
    public readonly merkleTree: StandardMerkleTree<any>;

    constructor(merklePaths: MerklePaths) {
        this.merkleTree = this.generateTree(merklePaths);
        this.merkleRoot = this.merkleTree.root;
        console.info("Merkle tree generated and saved to: ", merklePaths.inputTokens);
    }

    private generateTree(merklePaths: MerklePaths): StandardMerkleTree<any[]> {
        const merkleData: MerkleInput = JSON.parse(fs.readFileSync(merklePaths.inputTokens).toString());
        const tree = StandardMerkleTree.of(merkleData.data, merkleData.solidityTypes);
        fs.writeFileSync(merklePaths.outputMerkleTree, JSON.stringify({root: tree.root, tree: tree.dump()}));
        return tree;
    }

    getOwnedItems() {
        const tokens: any = {};
        for (const [, entry] of this.merkleTree.entries()) {
            tokens[entry[0]] = tokens[entry[0]] || {ids: [], amounts:[]};
            tokens[entry[0]].ids.push(entry[1]);
            tokens[entry[0]].amounts.push(entry[2]);
        }
        return tokens;
    }

    getOwnedArcadians() {
        const tokens: any = {};
        for (const [, entry] of this.merkleTree.entries()) {
            tokens[entry[0]] = tokens[entry[0]] || 0;
            tokens[entry[0]] += entry[1];
        }
        return tokens;
    }

    generateProof(address: string): string[] {
        for (const [i, entry] of this.merkleTree.entries()) {
          if (entry[0] === address) {
            return this.merkleTree.getProof(i);
          }
        }
        return [];
    }

    generateProofs(address: string): string[][] {
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