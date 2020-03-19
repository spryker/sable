'use strict';

const path = require('path');
const fastGlob = require('fast-glob');
const log = require('./log');
const cwd = process.cwd();

function parseSettings(settings) {
    return Object.assign({}, {
        glob: {
            onlyFiles: false
        }
    }, settings);

}

function parseOrigin(initial) {
    return initial || {};
}

async function fastGlobAsync(patterns, rootConfiguration) {
    try {
        return await fastGlob(patterns, rootConfiguration);
    } catch(error) {
        log.error('An error occurred while globbing the system for entry points.', error);
    }
}

async function glob(configuration, dirs, patterns) {
    return await dirs.reduce(async (resultsPromise, dir) => {
        const relativeRoot = dir.replace(cwd, '.');
        log.debug('searching in', relativeRoot + '...');

        const rootConfiguration = {
            ...configuration,
            cwd: dir
        }

        const results = await resultsPromise;
        const fastGlobPath = await fastGlobAsync(patterns, rootConfiguration);
        const fastGlobFullPath = fastGlobPath.map(result => path.join(dir, result));

        return results.concat(fastGlobFullPath);
    }, Promise.resolve([]));
}

function toObject(paths, defineName) {
    return paths.reduce((object, currentPath) => {
        let name = defineName ? defineName(currentPath) : path.basename(currentPath);
        object[name] = currentPath;
        return object;
    }, {});
}

async function find(settings, initial) {
    settings = parseSettings(settings);

    log.debug('settings:', settings);

    let results = await glob(settings.glob, settings.dirs, settings.patterns);
    let count = 0;

    log.task('find');

    initial = parseOrigin(initial);

    log.debug('initial:', initial);

    if (settings.description) {
        log.step(settings.description);
    }

    if (Array.isArray(initial)) {
        results = initial.concat(results);
        count = results.length;
    } else {
        results = Object.assign({}, initial, toObject(results, settings.defineName));
        count = Object.keys(results).length;
    }

    log.debug('results:', results);
    log.done(count, 'found');

    return results;
}

module.exports = find;
