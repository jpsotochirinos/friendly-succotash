/**
 * Converts an EMF image to SVG data URI.
 *
 * @param {string} data - Base64 encoded data or data URI of the EMF file
 * @param {{ width?: number, height?: number }} [size] - Optional size override
 * @returns {{ dataUri: string, format: string }|null} Data URI plus format, or null if conversion fails
 */
export function convertEmfToSvg(data: string, size?: {
    width?: number;
    height?: number;
}): {
    dataUri: string;
    format: string;
} | null;
/**
 * Converts a WMF image to SVG data URI.
 *
 * @param {string} data - Base64 encoded data or data URI of the WMF file
 * @param {{ width?: number, height?: number }} [size] - Optional size override
 * @returns {{ dataUri: string, format: string }|null} Data URI plus format, or null if conversion fails
 */
export function convertWmfToSvg(data: string, size?: {
    width?: number;
    height?: number;
}): {
    dataUri: string;
    format: string;
} | null;
/**
 * Converts an EMF or WMF image to SVG data URI based on the file extension.
 *
 * @param {string} dataUri - Base64 data URI of the metafile
 * @param {string} extension - File extension ('emf' or 'wmf')
 * @param {{ width?: number, height?: number }} [size] - Optional size override
 * @returns {{ dataUri: string, format: string }|null} Data URI plus format, or null if conversion fails
 */
export function convertMetafileToSvg(dataUri: string, extension: string, size?: {
    width?: number;
    height?: number;
}): {
    dataUri: string;
    format: string;
} | null;
/**
 * Checks if a file extension is a metafile format that can be converted.
 *
 * @param {string} extension - File extension to check
 * @returns {boolean} True if the extension is 'emf' or 'wmf'
 */
export function isMetafileExtension(extension: string): boolean;
export function setMetafileDomEnvironment(env: {
    mockWindow?: Window | null;
    window?: Window | null;
    mockDocument?: Document | null;
    document?: Document | null;
} | null): void;
//# sourceMappingURL=metafile-converter.d.ts.map