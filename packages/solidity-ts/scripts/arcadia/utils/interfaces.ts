import path from "path";

export const stackMintingORAPath = path.join(__dirname, "../dataV2/stackMintingORA.json");
export const claimableItemsPath = path.join(__dirname, "../output/claimableItemsV2.json");
export const claimableItemsGlobalPath = path.join(__dirname, "../output/claimableItemsGlobalV2.json");
export const claimableItemsCounterPath = path.join(__dirname, "../output/claimableItemsCounter.json");
export const extensiveItemsClaimPath = path.join(__dirname, "../output/extensiveItemsClaim.json");
export const itemsClaimConverterPath = path.join(__dirname, "../dataV2/itemsClaimConverter.json");
export const itemsPath = path.join(__dirname, "../dataV2/items.json");
export const slotsPath = path.join(__dirname, "../dataV2/slots.json");
export const itemsMerklePath = path.join(__dirname, "../output/itemsMerkle.json");

export interface Slot {
    id: number,
    name?: string,
    permanent: boolean,
    isBase: boolean,
    allowedItems: number[]
}
export interface SlotSC {
    id: number,
    permanent: boolean,
    isBase: boolean,
    allowedItems: ItemSC[]
}

export const ItemKeys = {
    id: "Smart Contract ID",
    layerName: "Layer Name",
    displayName: "Display Name",
    slotId: "slotId",
    slotName: "Slot Name",
    isBasic: "Is Basic",
    mintAmount: "Mint Amount",
}

export interface Item {
    id: number,
    layerName: string, // only used to read the ora file
    displayName: string,
    slotId: number,
    slotName: string,
    isBasic: boolean,
    mintAmount: number
}
export interface ItemSC {
    erc1155Contract: string,
    id: number
}

export interface ItemV1V2Converter {
    owner: string,
    nameV1: string,
    namesV2: string[],
    idV2: number,
    amount: number,
    slot: string
}
export interface ClaimableItem {
    owner?: string,
    nameV1: string,
    nameV2: string,
    idV2: number,
    amount: number,
    slot: string,
    slotId: number
}
export interface ClaimableItemsObj {
    [owner: string]: ItemV1V2Converter[]
}