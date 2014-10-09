gulp.task('test-coverage', 'Run unit tests with test coverage', function (cb) {
  gulp.src(['lib/**/SPECIFIC_FILE.js'])
    .pipe(i) // Covering files
    .on('finish', function () {
      gulp.src(['spec/**/*.js'])
        .pipe(jasmine({
          verbose: true
        }))
        .on('finish', function () {
          var data = istanbul.summarizeCoverage();
          console.log(data);
          cb();
        });
    });
});