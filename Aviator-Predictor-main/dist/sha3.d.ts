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
interface SHAKEOptionsNoEncodingType {
    numRounds?: number;
}
interface SHAKEOptionsEncodingType extends SHAKEOptionsNoEncodingType {
    encoding?: EncodingType;
}
interface CSHAKEOptionsNoEncodingType {
    customization?: GenericInputType;
    funcName?: GenericInputType;
}
interface CSHAKEOptionsEncodingType extends CSHAKEOptionsNoEncodingType {
    encoding?: EncodingType;
}
interface KMACOptionsNoEncodingType {
    kmacKey: GenericInputType;
    customization?: GenericInputType;
}
interface KMACOptionsEncodingType extends KMACOptionsNoEncodingType {
    encoding?: EncodingType;
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

/**
 * Int_64 is a object for 2 32-bit numbers emulating a 64-bit number.
 */
declare class Int_64 {
    /**
     * @param msint_32 The most significant 32-bits of a 64-bit number.
     * @param lsint_32 The least significant 32-bits of a 64-bit number.
     */
    readonly highOrder: number;
    readonly lowOrder: number;
    constructor(msint_32: number, lsint_32: number);
}

type FixedLengthVariantType = "SHA3-224" | "SHA3-256" | "SHA3-384" | "SHA3-512" | "SHAKE128" | "SHAKE256";
type VariantType = FixedLengthVariantType | "SHAKE128" | "SHAKE256" | "CSHAKE128" | "CSHAKE256" | "KMAC128" | "KMAC256";
declare class jsSHA extends jsSHABase<Int_64[][], VariantType> {
    intermediateState: Int_64[][];
    variantBlockSize: number;
    bigEndianMod: -1 | 1;
    outputBinLen: number;
    isVariableLen: boolean;
    HMACSupported: boolean;
    converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
    roundFunc: (block: number[], H: Int_64[][]) => Int_64[][];
    finalizeFunc: (remainder: number[], remainderBinLen: number, processedBinLen: number, H: Int_64[][], outputLen: number) => number[];
    stateCloneFunc: (state: Int_64[][]) => Int_64[][];
    newStateFunc: (variant: VariantType) => Int_64[][];
    getMAC: ((options: {
        outputLen: number;
    }) => number[]) | null;
    constructor(variant: FixedLengthVariantType, inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
    constructor(variant: FixedLengthVariantType, inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
    constructor(variant: "SHAKE128" | "SHAKE256", inputFormat: "TEXT", options?: SHAKEOptionsEncodingType);
    constructor(variant: "SHAKE128" | "SHAKE256", inputFormat: FormatNoTextType, options?: SHAKEOptionsNoEncodingType);
    constructor(variant: "CSHAKE128" | "CSHAKE256", inputFormat: "TEXT", options?: CSHAKEOptionsEncodingType);
    constructor(variant: "CSHAKE128" | "CSHAKE256", inputFormat: FormatNoTextType, options?: CSHAKEOptionsNoEncodingType);
    constructor(variant: "KMAC128" | "KMAC256", inputFormat: "TEXT", options: KMACOptionsEncodingType);
    constructor(variant: "KMAC128" | "KMAC256", inputFormat: FormatNoTextType, options: KMACOptionsNoEncodingType);
    /**
     * Initialize CSHAKE variants.
     *
     * @param options Options containing CSHAKE params.
     * @param funcNameOverride Overrides any "funcName" present in `options` (used with KMAC)
     * @returns The delimiter to be used
     */
    protected _initializeCSHAKE(options?: CSHAKEOptionsNoEncodingType, funcNameOverride?: packedValue): number;
    /**
     * Initialize KMAC variants.
     *
     * @param options Options containing KMAC params.
     */
    protected _initializeKMAC(options: KMACOptionsNoEncodingType): void;
    /**
     * Returns the the KMAC in the specified format.
     *
     * @param options Hashmap of extra outputs options. `outputLen` must be specified.
     * @returns The KMAC in the format specified.
     */
    protected _getKMAC(options: {
        outputLen: number;
    }): number[];
}

export { jsSHA as default };
