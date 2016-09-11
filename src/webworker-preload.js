/**
 * Web Worker Resource Preloader
 *
 * @author  https://pagespeed.pro
 *          https://optimalisatie.nl
 * 
 * @version  0.0.1
 * @link https://github.com/optimalisatie/webworker-preload
 */

(function (root) {

    // check support
    if (typeof(Worker) !== "undefined") {
        var workerSupport = true;
    } else {
        var workerSupport = false;
    }

    if (typeof console === 'undefined' || typeof console.error === 'undefined') {
        var consoleError = function(err) {
            // dummy
        }
    } else {
        var consoleError = function() {
            console.error.apply(console,arguments);
        }
    }

    /**
     * Web Worker source code
     */
    var workerCode = ((function() {

        /**
         * Preload resources
         */
        var preload = function(data) {

            /**
             * Resources to load
             */
            var resources = [];

            /**
             * Data is array, autodetect resource type from string or parse object config
             */
            if (data instanceof Array) {

                var l = data.length;
                for (var i = 0; i < l; i++) {

                    /**
                     * Config array
                     *
                     * index 1: uri
                     * index 2: onload callback
                     * index 3: type
                     */
                    if (data[i] instanceof Array) {

                        if (data[i].length < 2 || data[i].length > 3) {

                            // not recognized, skip
                            throw new Error('wwpreload: array config (index '+i+') not valid');
                        } else {

                            // verify callback
                            if (typeof data[i][1] !=='undefined' && isNaN(data[i][1])) {

                                // not recognized, skip
                                throw new Error('wwpreload: array config (index '+i+') not valid (callback id)');
                            }

                            // add to resource preload list
                            resources.push(data[i]);
  
                        }
                            
                    } else 

                    /**
                     * Parse string, auto detect resource type
                     */
                    if (typeof data[i] === 'string') {

                        resources.push([data[i]]);
                    }
                }
            }

            // errors
            var errors = [];

            if (resources.length > 0) {

                var done = resources.length;

                var l = resources.length;
                for (var i = 0; i < l; i++) {

                    (function PreloadResource(uri,callbackID) {

                        var resourceLoaded = false;

                        var onload = function(err) {

                            resourceLoaded = true;

                            // resource specific callback
                            if (callbackID) {
                                resourceCompleted(callbackID,(err) ? 'error': 'ok');
                            }

                            if (--done === 0) {
                                preloadCompleted(errors);
                            }
                        }

                        // start XHR request
                        var xhr = new XMLHttpRequest();
                        xhr.responseType = 'blob';

                        xhr.onreadystatechange = function () {
                            if (resourceLoaded) {
                                return;
                            }
                            if (xhr.readyState === 4) {

                                if (xhr.status !== 200) {
                                    onload(true);
                                } else {
                                    onload();
                                }
                            }
                        }
                        /**
                         * Resource load completed
                         */
                        xhr.onload = function resourceLoaded() {
                            if (resourceLoaded) {
                                return;
                            }
                            onload();
                        };
                        xhr.onerror = function resourceError() {
                            if (resourceLoaded) {
                                return;
                            }

                            errors.push(uri);

                            onload(true);
                        };

                        xhr.open('GET', uri, true);
                        xhr.send();

                    })(resources[i][0],resources[i][1]);
                }
            }
        };

        /**
         * Post back to UI after completion
         */
        var preloadCompleted = function(errors) {

            var msg = [1];
            if (errors.length > 0) {
                msg.push(errors);
            }
            self.postMessage(msg);
            self.close();
        };

        /**
         * Post back to UI after completion of specific resource
         */
        var resourceCompleted = function(callbackID,status) {
            self.postMessage([2,callbackID,status]);
        };

        /**
         * Handle request for web worker
         */
        self.onmessage = function (oEvent) {
            preload(oEvent.data,postMessage);
        }

    }).toString()
        .replace(/^function\s*\(\s*\)\s*\{/,'')
        .replace(/\}$/,'')
    );

    /**
     * Create blob url from javascript code
     *
     * @param jsData Javascript code
     */
    var createBlobUrl = function(jsData) {
        var blob;

        /**
         * Create blob
         */
        try {
            blob = new Blob([jsData], {type: 'application/javascript'});
        } catch (e) { // Backwards-compatibility
            window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
            blob = new BlobBuilder();
            blob.append(jsData);
            blob = blob.getBlob();
        }

        /**
         * Return blob url
         */
        return URL.createObjectURL(blob);
    };

    /**
     * Create worker URI
     */
    var workerUri = createBlobUrl(workerCode);

    /**
     * Resource onload callbacks
     */
    var RESOURCE_ONLOAD_CALLBACKS = {};
    var RESOURCE_ONLOAD_CALLBACK_COUNT = 0;

    /**
     * Parse url
     */
    var parseUrl = function(uri) {

        var link = document.createElement('a');
        link.href = uri;

        return link.protocol+"//"+link.host+link.pathname+link.search;
    };

    /**
     * Start preload worker
     */
    var PRELOAD = function(data,onLoad,onError) {

        /**
         * Resources to preload
         * @type {Array}
         */
        var resources = [];
        var loadedFiles = [];

        /**
         * Process data with resources
         */
        var l = data.length;
        for (var i = 0; i < l; i++) {
            
            // array config (minimal size)
            if (data[i] instanceof Array) {
                if (data[i].length < 2 || data[i].length > 3) {
                    handleError('invalid resource config at index',i,data[i]);
                    return;
                }

                // resource onload callback
                if (data[i][1]) {
                    if (typeof data[i][1] !== 'function') {
                        handleError('resource onload callback is not a function',i,data[i]);
                        return;
                    }
                    var callbackID = ++RESOURCE_ONLOAD_CALLBACK_COUNT;
                    RESOURCE_ONLOAD_CALLBACKS['cb' + callbackID] = data[i][1];
                    data[i][1] = callbackID;

                    console.log('created callback',data[i],RESOURCE_ONLOAD_CALLBACKS['cb' + callbackID]);
                }

                // loaded files list
                loadedFiles.push(data[i][0]);

                // convert url
                data[i][0] = parseUrl(data[i][0]);

                resources.push(data[i]);

            } else if (typeof data[i] === 'object') {

                if (!data[i].uri) {
                    handleError('invalid resource config at index',i,data[i]);
                    return;
                }

                // loaded files list
                loadedFiles.push(data[i].uri);

                var entry = [parseUrl(data[i].uri)];

                /**
                 * Resource onload callback
                 */
                if (data[i].callback) {
                    if (typeof data[i].callback !== 'function') {
                        handleError('resource onload callback is not a function',i,data[i]);
                        return;
                    }
                    var callbackID = ++RESOURCE_ONLOAD_CALLBACK_COUNT;
                    RESOURCE_ONLOAD_CALLBACKS['cb' + callbackID] = data[i].callback;
                    data[i].callback = callbackID;

                    entry.push(callbackID);

                    if (data[i].type) {
                        entry.push(data[i].type);
                    }
                } else if (data[i].type) {
                    entry.push(null,data[i].type);
                }

                resources.push(entry);

            } else if (typeof data[i] === 'string') {

                // loaded files list
                loadedFiles.push(data[i]);

                resources.push(parseUrl(data[i]));

            } else {

                // not recognized, ignore
            }
        }

        if (resources.length === 0) {
            handleError('no resources to preload');
            return;
        }

        console.log('resources',resources,data);

        // start web worker
        var worker = new Worker(workerUri);

        /**
         * Handle errors
         */
        var handleError = function(error) {
            
            if (typeof error === 'object' && error.preventDefault) {
                error.preventDefault();
            }

            // output error to console
            consoleError('preloadww:',error);

            if (onError) {
                onError(error);
            }
        };

        // listen for message
        worker.addEventListener('message', function(event) {
            var response = event.data;

            // verify response type
            if (response instanceof Array) {

                /**
                 * Preloading completed
                 */
                if (parseInt(response[0]) === 1) {

                    // error
                    if (response[1]) {
                        consoleError('preloadww:','failed to load',response[1]);
                    }

                    onLoad(loadedFiles);

                    if (worker) {
                        worker.terminate();
                        worker = undefined;
                    }

                } else

                /**
                 * Resource onload handler
                 */
                if (parseInt(response[0]) === 2) {

                    console.log('resource onload',response);

                    // loading of resource completed, call specific callback
                    var callbackID = response[1];
                    var status = (parseInt(response[2]) === 1) ? 'ok' : 'error'; // 1 = ok, 2 = error

                    if (typeof RESOURCE_ONLOAD_CALLBACKS['cb' + callbackID] !== 'undefined') {
                        RESOURCE_ONLOAD_CALLBACKS['cb' + callbackID](status);
                        delete RESOURCE_ONLOAD_CALLBACKS['cb' + callbackID];
                    }

                }
            } else {
                handleError('invalid response from worker');
            }

        });

        // listen for error
        worker.addEventListener('error',handleError);

        // post data to worker
        worker.postMessage(resources);
    };

    /**
     * Web Worker Preload Controller Object
     */
    var preloadww = function(data,onLoad,onError) {

        if (!workerSupport) {
            consoleError('preloadww: web workers not supported');
            return;
        }

        // array of objects/strings, use as is
        if (data instanceof Array) {
            if (data[0] instanceof Array) {

                // array of array config
            } else {

                data = [data];
            }
        } else if (typeof data === 'object' && data.type && data.uri) {

            // single object config
            data = [data];
        } else if (typeof data === 'string') {

            data = [data];
        } else {
            consoleError('preloadww: invalid resource config',data);
            return;
        }

        // start preloading
        PRELOAD(data,onLoad,onError);
    };

    // Node.js
    if (typeof module === 'object' && module.exports) {
        module.exports = preloadww;
    }
    // AMD / RequireJS
    else if (typeof define === 'function' && define.amd) {
        define([], function () {
            return preloadww;
        });
    }
    // included directly via <script> tag
    else {
        root.preloadww = preloadww;
    }

}(typeof self === 'object' && self.self === self && self ||
            typeof global === 'object' && global.global === global && global ||
            this));
