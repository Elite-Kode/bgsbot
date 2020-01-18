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

gulp.task('version', function versionFile(done) {
    const versionFilePath = path.join(__dirname + '/src/version.ts');

    const src = `export const Version = '${appVersion}';\n`;
    fs.writeFileSync(versionFilePath, src);
    done();
});

gulp.task('scripts', function compile() {
    return tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .js.pipe(sourcemaps.write())
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', gulp.series('scripts', async function watchTs() {
    return gulp.watch('src/**/*.ts', gulp.series('scripts'));
}));

gulp.task('assets', function copyAssets() {
    return gulp.src(JSON_FILES)
        .pipe(gulp.dest('dist'));
});

gulp.task('nodemon', gulp.series(gulp.parallel('assets', 'watch'), async function runNodeMon() {
    nodemon({
        script: './dist/bin/start.js',
        nodeArgs: ['--inspect']
    });
}));

gulp.task('default', gulp.parallel('version', 'nodemon'));
