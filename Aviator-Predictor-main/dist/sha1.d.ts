type EncodingType = "UTF8" | "UTF16BE" | "UTF16LE";
type FormatNoTextType = "HEX" | "B64" | "BYTES" | "ARRAYBUFFER" | "UINT8ARRAY";
type FormatType = "TEXT" | FormatNoTextType;
type GenericInputType = {
    value: string;
    format: "TEXT";
    encoding?: EncodingType;
} | {
    value: string;
    format: "B64" | "HEX" | "BYTES";
} | {
    value: ArrayBuffer;
    format: "ARRAYBUFFER";
} | {
    value: Uint8Array;
    format: "UINT8ARRAY";
};
type FixedLengthOptionsNoEncodingType = {
    hmacKey?: GenericInputType;
} | {
    numRounds?: number;
};
type FixedLengthOptionsEncodingType = {
    hmacKey?: GenericInputType;
    encoding?: EncodingType;
} | {
    numRounds?: number;
    encoding?: EncodingType;
};
interface packedValue {
    value: number[];
    binLen: number;
}

declare abstract class jsSHABase<StateT, VariantT> {
    protected readonly shaVariant: VariantT;
    protected readonly inputFormat: FormatType;
    protected readonly utfType: EncodingType;
    protected readonly numRounds: number;
    protected abstract intermediateState: StateT;
    protected keyWithIPad: number[];
    protected keyWithOPad: number[];
    protected remainder: number[];
    protected remainderLen: number;
    protected updateCalled: boolean;
    protected processedLen: number;
    protected macKeySet: boolean;
    protected abstract readonly variantBlockSize: number;
    protected abstract readonly bigEndianMod: -1 | 1;
    protected abstract readonly outputBinLen: number;
    protected abstract readonly isVariableLen: boolean;
    protected abstract readonly HMACSupported: boolean;
    protected abstract readonly converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
    protected abstract readonly roundFunc: (block: number[], H: StateT) => StateT;
    protected abstract readonly finalizeFunc: (remainder: number[], remainderBinLen: number, processedBinLen: number, H: StateT, outputLen: number) => number[];
    protected abstract readonly stateCloneFunc: (state: StateT) => StateT;
    protected abstract readonly newStateFunc: (variant: VariantT) => StateT;
    protected abstract readonly getMAC: ((options: {
        outputLen: number;
    }) => number[]) | null;
    protected constructor(variant: VariantT, inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
    protected constructor(variant: VariantT, inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
    /**
     * Process as many chunks as possible from input and save remainder.
     */
    update(src: string | ArrayBuffer | Uint8Array): this;
    /**
     * Produce final hash value.
     */
    getHash(format: any, options?: any): any;
    /**
     * Configure HMAC key — must be called before update().
     */
    setHMACKey(key: any, inputFormat: any, options?: any): void;
    protected _setHMACKey(key: packedValue): void;
    /**
     * Return HMAC result using previously-set key.
     */
    getHMAC(format: any, options?: any): any;
    protected _getHMAC(): number[];
}

declare class jsSHA extends jsSHABase<number[], "SHA-1"> {
    intermediateState: number[];
    variantBlockSize: number;
    bigEndianMod: -1 | 1;
    outputBinLen: number;
    isVariableLen: boolean;
    HMACSupported: boolean;
    converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
    roundFunc: (block: number[], H: number[]) => number[];
    finalizeFunc: (remainder: number[], remainderBinLen: number, processedBinLen: number, H: number[]) => number[];
    stateCloneFunc: (state: number[]) => number[];
    newStateFunc: (variant: "SHA-1") => number[];
    getMAC: () => number[];
    constructor(variant: "SHA-1", inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
    constructor(variant: "SHA-1", inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
}

export { jsSHA as default };
