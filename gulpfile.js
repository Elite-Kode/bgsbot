const gulp = require('gulp');
const ts = require('gulp-typescript');
const nodemon = require('gulp-nodemon');
const sourcemaps = require('gulp-sourcemaps');
const JSON_FILES = ['src/*.json', 'src/**/*.json'];
const path = require('path');
const fs = require('fs');
const appVersion = require('./package.json').version;

// pull in the project TypeScript config
const tsProject = ts.createProject('tsconfig.json');

gulp.task('version', () => {
    const versionFilePath = path.join(__dirname + '/src/version.ts');

    const src = `export const Version = '${appVersion}';\n`;

    fs.writeFileSync(versionFilePath, src);
});

gulp.task('scripts', () => {
    return tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .js.pipe(sourcemaps.write("."))
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', ['scripts'], () => {
    return gulp.watch('src/**/*.ts', ['scripts']);
});

gulp.task('assets', function () {
    return gulp.src(JSON_FILES)
        .pipe(gulp.dest('dist'));
});

gulp.task('nodemon', ['scripts', 'assets', 'watch'], () => {
    nodemon({
        script: './dist/bin/start.js',
        nodeArgs: ['--inspect']
    });
});

gulp.task('default', ['version', 'nodemon']);
