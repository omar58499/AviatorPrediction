type EncodingType = "UTF8" | "UTF16BE" | "UTF16LE";
type FormatNoTextType = "HEX" | "B64" | "BYTES" | "ARRAYBUFFER" | "UINT8ARRAY";
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

type FixedLengthVariantType = "SHA-1" | "SHA-224" | "SHA-256" | "SHA-384" | "SHA-512" | "SHA3-224" | "SHA3-256" | "SHA3-384" | "SHA3-512";
declare class jsSHA {
    private readonly shaObj;
    /**
     * Creates a new SHA hash instance
     * @param variant The desired SHA variant (SHA-1, SHA-224, SHA-256, SHA-384, SHA-512,
     *   SHA3-224, SHA3-256, SHA3-384, SHA3-512, SHAKE128, SHAKE256, CSHAKE128, CSHAKE256,
     *   KMAC128, or KMAC256)
     * @param inputFormat The format for input data (TEXT, HEX, B64, BYTES, ARRAYBUFFER, UINT8ARRAY)
     * @param options Additional settings like encoding, number of rounds, or keys
     */
    constructor(variant: FixedLengthVariantType, inputFormat: "TEXT", options?: FixedLengthOptionsEncodingType);
    constructor(variant: FixedLengthVariantType, inputFormat: FormatNoTextType, options?: FixedLengthOptionsNoEncodingType);
    constructor(variant: "SHAKE128" | "SHAKE256", inputFormat: "TEXT", options?: SHAKEOptionsEncodingType);
    constructor(variant: "SHAKE128" | "SHAKE256", inputFormat: FormatNoTextType, options?: SHAKEOptionsNoEncodingType);
    constructor(variant: "CSHAKE128" | "CSHAKE256", inputFormat: "TEXT", options?: CSHAKEOptionsEncodingType);
    constructor(variant: "CSHAKE128" | "CSHAKE256", inputFormat: FormatNoTextType, options?: CSHAKEOptionsNoEncodingType);
    constructor(variant: "KMAC128" | "KMAC256", inputFormat: "TEXT", options: KMACOptionsEncodingType);
    constructor(variant: "KMAC128" | "KMAC256", inputFormat: FormatNoTextType, options: KMACOptionsNoEncodingType);
    /**
     * Update the internal hash state with more data.
     * Accepts strings, ArrayBuffer, Uint8Array or any ArrayBufferView.
     */
    update(input: string | ArrayBuffer | Uint8Array | ArrayBufferView): this;
    getHash(format: "HEX", options?: {
        outputUpper?: boolean;
        outputLen?: number;
        shakeLen?: number;
    }): string;
    getHash(format: "B64", options?: {
        b64Pad?: string;
        outputLen?: number;
        shakeLen?: number;
    }): string;
    getHash(format: "BYTES", options?: {
        outputLen?: number;
        shakeLen?: number;
    }): string;
    getHash(format: "UINT8ARRAY", options?: {
        outputLen?: number;
        shakeLen?: number;
    }): Uint8Array;
    getHash(format: "ARRAYBUFFER", options?: {
        outputLen?: number;
        shakeLen?: number;
    }): ArrayBuffer;
    setHMACKey(key: string, inputFormat: "TEXT", options?: {
        encoding?: EncodingType;
    }): void;
    setHMACKey(key: string, inputFormat: "B64" | "HEX" | "BYTES"): void;
    setHMACKey(key: ArrayBuffer, inputFormat: "ARRAYBUFFER"): void;
    setHMACKey(key: Uint8Array, inputFormat: "UINT8ARRAY"): void;
    getHMAC(format: "HEX", options?: {
        outputUpper?: boolean;
    }): string;
    getHMAC(format: "B64", options?: {
        b64Pad?: string;
    }): string;
    getHMAC(format: "BYTES"): string;
    getHMAC(format: "UINT8ARRAY"): Uint8Array;
    getHMAC(format: "ARRAYBUFFER"): ArrayBuffer;
}

export { jsSHA as default };
