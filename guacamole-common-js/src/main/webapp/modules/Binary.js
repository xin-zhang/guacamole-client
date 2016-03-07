/*
 * Copyright (C) 2016 Glyptodon, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var Guacamole = Guacamole || {};

/**
 * Utility class for decoding and encoding binary data from Guacamole's native,
 * Unicode-safe 7-bit encoding. The 7-bit encoding uses only Unicode codepoints
 * U+0000 through U+007F, which are bytes 0 through 127 when encoded as UTF-8.
 * 
 * @namespace
 */
Guacamole.Binary = {

    /**
     * Encodes the given binary string as a 7-bit string, where each codepoint
     * in the input is identical in value to the byte at that position,
     * analogous to the result of invoking window.btoa() on a binary string.
     * All bits of the binary input data are written to only the low 7 bits of
     * each byte in the encoded output.
     *
     * @param {String} str
     *     The binary string shich should be encoded.
     *
     * @returns {String}
     *     The 7-bit encoded string which results from encoding the given
     *     binary string.
     */
    encodeAsString: function encodeAsString(str) {

        // Final output buffer (characters)
        var outputChars = '';
        var outputChar;

        // Rolling buffer (bits, will contain no more than 15 bits at any time)
        var outputBitBuffer = 0;
        var outputBitLength = 0;

        // Add each byte within the buffer as a new 7-bit quantity + extra bits
        for (var i = 0; i < str.length; i++) {

            // Shift on new byte to bit buffer
            outputBitBuffer = (outputBitBuffer << 8) | str.charCodeAt(i);
            outputBitLength += 8;

            // Shift off 7 bits until more bits are needed
            while (outputBitLength >= 7) {

                // Pull leftmost seven bits
                outputBitLength -= 7;
                outputChar = (outputBitBuffer >> outputBitLength) & 0x7F;

                // Add output buffer as one char
                outputChars += String.fromCharCode(outputChar);

            }

        }

        // If any bits remain, append as the final character
        if (outputBitLength !== 0) {
            outputChar = (outputBitBuffer << (7 - outputBitLength)) & 0x7F;
            outputChars += String.fromCharCode(outputChar);
        }

        return outputChars;

    },

    /**
     * Decodes the given string as a binary string, where each codepoint in the
     * result is identical in value to the byte at that position, analogous to
     * the result of invoking window.atob() on a base64 string. All bits of the
     * underlying binary data are read from the low 7 bits of each byte in the
     * encoded input.
     *
     * @param {String} str
     *     The encoded string shich should be decoded.
     *
     * @returns {String}
     *     The binary string resulting from decoding the given input string.
     */
    decodeAsString: function decodeAsString(str) {

        var outputBytes = '';

        var bitBuffer = 0;
        var bitLength = 0;

        // Read and append every 7-bit value in the given string
        for (var i = 0; i < str.length; i++) {

            // Shift on 7-bits for every value in the string
            bitBuffer = (bitBuffer << 7) | str.charCodeAt(i);
            bitLength += 7;

            // Write one byte for every 8 bits
            if (bitLength >= 8) {
                var value = (bitBuffer >> (bitLength - 8)) & 0xFF;
                outputBytes += String.fromCharCode(value);
                bitLength -= 8;
            }

        }

        return outputBytes;

    },

    /**
     * Decodes the given 7-bit string as base64. The result of this operation
     * is identical to invoking window.btoa() on the result of decoding the
     * given string with Guacamole.Binary.decodeAsString(), but more efficient.
     *
     * @param {String} str
     *     The encoded string shich should be decoded.
     *
     * @returns {String}
     *     The base64-encoded string resulting from decoding the given input
     *     string.
     */
    decodeAsBase64: function decodeAsBase64(str) {

        var paddingBits = (str.length * 7) % 8;
        var base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        var outputBytes = '';

        var bitBuffer = 0;
        var bitLength = 0;

        // Read and append every 7-bit value in the given string
        for (var i = 0; i < str.length; i++) {

            // Shift on 7-bits for every value in the string
            bitBuffer = (bitBuffer << 7) | str.charCodeAt(i);
            bitLength += 7;

            // Write one character for every 6 bits (avoiding the padding)
            while (bitLength >= 6 + paddingBits) {
                var value = (bitBuffer >> (bitLength - 6)) & 0x3F;
                outputBytes += base64.charAt(value);
                bitLength -= 6;
            }

        }

        // Shift off the padding from the 7-bit encoding process
        bitBuffer >>= paddingBits;
        bitLength -= paddingBits;

        // If any bits remain, append as the final character
        if (bitLength !== 0) {
            value = (bitBuffer << (6 - bitLength)) & 0x3F;
            outputBytes += base64.charAt(value);
        }

        // Pad up to nearest multiple of 4
        while (outputBytes.length % 4 !== 0)
            outputBytes += '=';

        return outputBytes;

    },

    /**
     * Decodes the given string as a new ArrayBuffer similar. All bits of the
     * binary data stored within this ArrayBuffer are read from the low 7 bits
     * of each byte in the encoded input.
     *
     * @param {String} str
     *     The encoded string shich should be decoded.
     *
     * @returns {Uint8Array}
     *     The ArrayBuffer resulting from decoding the given input string.
     */
    decodeAsArrayBuffer: function decodeAsArrayBuffer(str) {

        var outputBytes = new Uint8Array((str.length * 7) >> 3);
        var outputLength = 0;

        var bitBuffer = 0;
        var bitLength = 0;

        // Read and append every 7-bit value in the given string
        for (var i = 0; i < str.length; i++) {

            // Shift on 7-bits for every value in the string
            bitBuffer = (bitBuffer << 7) | str.charCodeAt(i);
            bitLength += 7;

            // Write one byte for every 8 bits
            if (bitLength >= 8) {
                var value = (bitBuffer >> (bitLength - 8)) & 0xFF;
                outputBytes[outputLength++] = value;
                bitLength -= 8;
            }

        }


        return outputBytes;

    }

};
