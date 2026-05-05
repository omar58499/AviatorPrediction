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

type VariantType = "SHA-384" | "SHA-512";
declare class jsSHA extends jsSHABase<Int_64[], VariantType> {
    intermediateState: Int_64[];
    variantBlockSize: number;
    bigEndianMod: -1 | 1;
    outputBinLen: number;
    isVariableLen: boolean;
    HMACSupported: boolean;
    maxInputBits: number;
    converterFunc: (input: any, existingBin: number[], existingBinLen: number) => packedValue;
    roundFunc: (block: number[], H: Int_64[]) => Int_64[];
    finalizeFunc: (remainder: number[], remainderBinLen: number, processedBinLen: number, H: Int_64[]) => number[];
    stateCloneFunc: (state: Int_64[]) => Int_64[];
    newStateFunc: (variant: VariantType) => Int_64[];
    getMAC: () => number[];
    constructor(variant: VariantType, inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
    constructor(variant: VariantType, inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
    /**
     * Override update to add input-size protection while delegating actual work to the base.
     * This does a cheap conversion check first (same converter used by base), then calls super.update.
     */
    update(src: string | ArrayBuffer | Uint8Array): this;
    /**
     * Returns the raw binary state as a full HEX string.
     * Useful for debugging or exposing intermediate state.
     */
    toHexArray(H: Int_64[]): string;
}
/**
 * Built-in self-test (NIST test vector for "abc").
 * Returns true if implementation matches expected SHA-512 result.
 */
declare function sha512SelfTest(): boolean;

export { jsSHA as default, sha512SelfTest };
