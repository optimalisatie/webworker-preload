## Web Worker Resource Preloader [![npm version](https://badge.fury.io/js/webworker-preload.svg)](http://badge.fury.io/js/webworker-preload)

_webworker-preload_ is a tool intended for advanced optimization purposes. It allows for preloading of resources such as javascript, CSS and image files using [Web Workers](http://www.html5rocks.com/en/tutorials/workers/basics/). Preloading resources using web workers has several advantages for optimization, it is non-blocking (it utilizes resources from CPU's not used for rendering) and it allows for delayed execution of javascript.

The size is <4kb.

## Usage

The tool consists of just 1 method that will accept an array with resources to preload. The array should consist of URL's and optionally a callback. Instead of entering URI strings it is possible to provide an array with objects.

The method accepts an onLoad callback and onError callback. The onLoad callback is always called upon completion, also when (some) files are on error.

The onLoad method will resolve with an array with URI's that have been preloaded.

```javascript
// simple array with string URI's to preload
window.preloadww(['/css/file1.css','/js/scripts.js','/js/mobile.js'], function onLoad(fileList) {
	console.info('preload completed',fileList);
},function onError(error) {
	console.error('preload failed',error);
});

// resource specific onload callback for script file
window.preloadww(['/css/file1.css',['/js/scripts.js', function scriptLoaded(status) { 
	if (status === 'ok') { 
		
		// execute javascript in container
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = '/js/script.js';
		document.getElementById('container').appendChild(script);

	} else if (status === 'error') {
		console.error('failed to preload script');
	}
}],'/js/mobile.js'], function onLoad(fileList) {
	console.info('preload completed',fileList);
},function onError(error) {
	console.error('preload failed',error);
});


// object based resource list
window.preloadww([{uri:'/css/file1.css'},{uri: '/js/scripts.js', callback: function scriptLoaded(status) { 
	if (status === 'ok') { 
		
		// execute javascript in container
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = '/js/script.js';
		document.getElementById('container').appendChild(script);

	} else if (status === 'error') {
		console.error('failed to preload script');
	}
}},{uri:'/js/mobile.js'}], function onLoad(fileList) {
	console.info('preload completed',fileList);
},function onError(error) {
	console.error('preload failed',error);
});
```

## Installation

### NPM (Node.js, Browserify, Webpack)

```bash
npm install --save webworker-preload
```

## Inspiration

The following article from [Matt Seeley](https://github.com/mseeley) provided inspiration for this tool.

https://gist.github.com/mseeley/9321422

## License

This library is published under the MIT license. See [LICENSE](https://raw.githubusercontent.com/optimalisatie/webworker-preload/master/LICENSE) for details.
