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
    decode: function decode(str) {

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

    }

};
