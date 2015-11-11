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
     * Internal GIF recording object which tracks the current state of the
     * recording and writes new frames as the recording progresses.
     *
     * @private
     * @constructor
     * @param {ManagedClient} client
     *     The ManagedClient associated with the Guacamole session that should
     *     be recorded.
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
         * The minimum amount of time between individual frames, in
         * milliseconds. Frames added in shorter intervals may be dropped.
         *
         * @constant
         * @type Number
         */
        var MINIMUM_FRAME_DELAY = 100;

        /**
         * The timestamp of the last frame provided via addFrame(), in
         * milliseconds, or null if no frames have yet been provided.
         *
         * @private
         * @type Number
         */
        var lastFrameTimestamp = null;

        /**
         * The ManagedClient associated with the Guacamole session that should
         * be recorded.
         *
         * @type ManagedClient
         */
        this.client = client;

        /**
         * GIF recording context for recording the Guacamole session of the
         * specified ManagedClient.
         *
         * @type GIF
         */
        this.gif = new GIF();

        /**
         * Adds a new frame to the in-progress recording using the contents of
         * the display of the given Guacamole client.
         *
         * @param {Guacamole.Client} guac
         *     The Guacamole client whose display contents should be added to
         *     the in-progress recording as a new frame.
         *
         * @param {Number} timestamp
         *     The timestamp of the frame being added, in milliseconds. This
         *     value is relative only to timestamps previously given to
         *     addFrame() on this specific Recording object.
         */
        this.addFrame = function addFrame(guac, timestamp) {

            var frameDelay = 0;
            if (lastFrameTimestamp) {

                // Calculate delay as the elapsed time since last frame
                frameDelay = timestamp - lastFrameTimestamp;

                // Do not attempt greater than 10 frames per second
                if (frameDelay < MINIMUM_FRAME_DELAY)
                    return;

            }

            // Produce full frame of display data
            var canvas = guac.getDisplay().flatten();

            // Write frame to GIF
            recording.gif.addFrame(canvas, {
                delay : frameDelay 
            });

            // Record timestamp of last rendered frame
            lastFrameTimestamp = timestamp;

        };

    };

    /**
     * Begins recording the Guacamole session associated with the given
     * ManagedClient.
     *
     * @param {ManagedClient} client
     *     The ManagedClient whose associated Guacamole session should be
     *     recorded.
     *
     * @returns {Recording}
     *     An opaque object representing the state of the in-progress
     *     recording. When recording is complete, this object must be passed
     *     to stopRecording().
     */
    service.startRecording = function startRecording(client) {

        var recording = new Recording(client);

        // Pull Guacamole client from ManagedClient
        var guac = client.client;

        // Install sync handler which writes each received Guacamole frame
        guac.onsync = function writeFrame(timestamp) {
            recording.addFrame(guac, timestamp);
        };

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

        // Pull Guacamole client from ManagedClient
        var guac = recording.client.client;

        // Stop rendering of further frames to the GIF
        guac.onsync = null;

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
