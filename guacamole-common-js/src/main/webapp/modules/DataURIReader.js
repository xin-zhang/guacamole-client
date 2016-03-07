/*
 * Copyright (C) 2015 Glyptodon LLC
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
 * A reader which automatically handles the given input stream, returning
 * received blobs as a single data URI built over the course of the stream.
 * Note that this object will overwrite any installed event handlers on the
 * given Guacamole.InputStream.
 * 
 * @constructor
 * @param {Guacamole.InputStream} stream
 *     The stream that data will be read from.
 */
Guacamole.DataURIReader = function(stream, mimetype) {

    /**
     * Reference to this Guacamole.DataURIReader.
     * @private
     */
    var guac_reader = this;

    /**
     * Current data URI.
     *
     * @private
     * @type {String}
     */
    var uri = 'data:' + mimetype + ';base64,';

    /**
     * All currently-received data, encoded as 7-bit.
     *
     * @private
     * @type {String}
     */
    var buffer = '';

    // Append blobs to buffer
    stream.onblob = function dataURIReaderBlob(data) {
        buffer += data;
    };

    // Finalize URI when stream ends
    stream.onend = function dataURIReaderEnd() {

        // Add base64 data to URI
        uri += Guacamole.Binary.decodeAsBase64(buffer);

        // Invoke provided onend handler, if defined
        if (guac_reader.onend)
            guac_reader.onend();

    };

    /**
     * Returns the data URI of all data received through the underlying stream
     * thus far.
     *
     * @returns {String}
     *     The data URI of all data received through the underlying stream thus
     *     far.
     */
    this.getURI = function getURI() {
        return uri;
    };

    /**
     * Fired once this stream is finished and no further data will be written.
     *
     * @event
     */
    this.onend = null;

};