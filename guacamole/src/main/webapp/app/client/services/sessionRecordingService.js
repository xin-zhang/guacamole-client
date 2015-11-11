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

/**
 * Service which provides for recording Guacamole sessions on the client side,
 * producing some arbitrary video or video-like file output.
 */
angular.module('client').factory('sessionRecordingService', ['$injector', function sessionRecordingService($injector) {

    // Required services
    var $q = $injector.get('$q');

    var service = {};

    /**
     * The minimum amount of time between individual frames, in
     * milliseconds. Frames added in shorter intervals may be dropped.
     *
     * @constant
     * @type Number
     */
    var MINIMUM_FRAME_DELAY = 20;

    /**
     * Internal GIF recording object which tracks the current state of the
     * recording and writes new frames as the recording progresses.
     *
     * @private
     * @constructor
     * @param {Guacamole.Client} client
     *     The Guacamole.Client associated with the Guacamole session that
     *     should be recorded.
     */
    var Recording = function Recording(client) {

        /**
         * Reference to this Recording object.
         *
         * @private
         * @type Recording
         */
        var recording = this;

        /**
         * The timestamp of the last frame provided via addFrame(), in
         * milliseconds, or null if no frames have yet been provided.
         *
         * @private
         * @type Number
         */
        var lastFrameTimestamp = null;

        /**
         * The local time, in milliseconds, of the call to addFrame() which
         * resulted in the rendering of a new frame. This timestamp is
         * identical in definition to <code>new Date().getTime()</code>. If no
         * frames have yet been provided, this will be null.
         *
         * @type Number
         */
        var lastFrameLocalTimestamp = null;

        /**
         * The Guacamole.Client associated with the Guacamole session that
         * should be recorded.
         *
         * @type Guacamole.Client
         */
        this.client = client;

        /**
         * GIF recording context for recording the Guacamole session of the
         * specified Guacamole.Client.
         *
         * @type GIF
         */
        this.gif = new GIF();

        /**
         * The ID of the interval set via <code>window.setInterval()</code>
         * which polls the associated Guacamole.Client for changes to the mouse
         * cursor location. If no such interval has been set, this will be
         * null.
         *
         * @type Number
         */
        this.mouseCheckInterval = null;

        /**
         * Adds a new frame to the in-progress recording using the contents of
         * the display of the Guacamole client associated with this Recording
         * object.
         *
         * @param {Number} [timestamp]
         *     The timestamp of the frame being added, in milliseconds. This
         *     value is relative only to timestamps previously given to
         *     addFrame() on this specific Recording object. If omitted, the
         *     timestamp will be approximated using the amount of time elapsed
         *     since addFrame() was last called.
         */
        this.addFrame = function addFrame(timestamp) {

            var localTimestamp = new Date().getTime();

            var frameDelay = 0;
            if (lastFrameTimestamp) {

                // Derive frame timestamp from local time if no timestamp is
                // provided
                if (!timestamp) {
                    timestamp = localTimestamp
                              + lastFrameTimestamp - lastFrameLocalTimestamp;
                }

                // Calculate delay as the elapsed time since last frame
                frameDelay = timestamp - lastFrameTimestamp;

                // Do not exceed minimum frame duration
                if (frameDelay < MINIMUM_FRAME_DELAY)
                    return;

            }

            // Produce full frame of display data
            var canvas = recording.client.getDisplay().flatten();

            // Write frame to GIF
            recording.gif.addFrame(canvas, {
                delay : frameDelay 
            });

            // Record timestamp of last rendered frame
            lastFrameTimestamp = timestamp;
            lastFrameLocalTimestamp = localTimestamp;

        };

    };

    /**
     * Begins recording the Guacamole session associated with the given
     * Guacamole.Client.
     *
     * @param {Guacamole.Client} client
     *     The Guacamole.Client whose associated Guacamole session should be
     *     recorded.
     *
     * @returns {Recording}
     *     An opaque object representing the state of the in-progress
     *     recording. When recording is complete, this object must be passed
     *     to stopRecording().
     */
    service.startRecording = function startRecording(client) {

        var recording = new Recording(client);

        // Install sync handler which writes each received Guacamole frame
        client.onsync = function writeFrame(timestamp) {
            recording.addFrame(timestamp);
        };

        // Pull current mouse location
        var display = client.getDisplay();
        var x = display.cursorX;
        var y = display.cursorY;

        // Render a new frame whenever the mouse cursor moves
        recording.mouseCheckInterval = window.setInterval(function checkMouse() {
            if (x !== display.cursorX || y !== display.cursorY) {
                recording.addFrame();
                x = display.cursorX;
                y = display.cursorY;
            }
        }, 20);

        return recording;

    };

    /**
     * Stops the in-progress recording associated with the given Recording
     * state object, returning a Promise which is eventually resolved with a
     * Blob containing a GIF of the recorded session.
     *
     * @param {Recording} recording
     *     The Recording state object of an in-progress recording that should
     *     be stopped, as returned by a call to startRecording().
     *
     * @returns {Promise.<Blob>}
     *     A Promise which resolves with a Blob containing the recorded
     *     Guacamole session in GIF format. This Promise is guaranteed to
     *     resolve successfully.
     */
    service.stopRecording = function stopRecording(recording) {

        var renderingProcess = $q.defer();

        // Stop rendering of further frames to the GIF
        recording.client.onsync = null;

        // Stop polling for changes to the mouse cursor
        window.clearInterval(recording.mouseCheckInterval);

        // Resolve promise once rendering is finished
        recording.gif.on('finished', function recordingComplete(blob) {
            renderingProcess.resolve(blob);
        });

        // Begin rendering of the gif
        recording.gif.render();

        return renderingProcess.promise;

    };

    return service;

}]);
