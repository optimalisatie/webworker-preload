/* global module:false */
module.exports = function(grunt) {

	var pkg = grunt.file.readJSON('package.json');

	// Project configuration
	grunt.initConfig({
		pkg: pkg,
		meta: {
			banner:
				'\n/*!\n' +
				' * Web Worker Preloader v<%= pkg.version %>\n' + 
				' * By https://pagespeed.pro/\n' +
				' * https://github.com/optimalisatie/webworker-preload\n' +
				' */',
		},

		uglify: {

			/**
			 * Websockify javascript
			 */
			dev: {
				options: {
					banner: '<%= meta.banner %>\n',
					compress: {
						dead_code: true
					},
					strict: false
				},
				files: {
					'dist/webworker-preload.min.js' : 'src/webworker-preload.js'
				}
			}

		}

	});

	// Load Dependencies
	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

	grunt.registerTask( 'dist', [ 'uglify' ] );

    grunt.registerTask( 'default', [ 'dist' ] );
};
