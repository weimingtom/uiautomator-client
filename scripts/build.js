#!/usr/bin/env node

/* ================================================================
 * uiautomator-client by xdf(xudafeng[at]126.com)
 *
 * first created at : Wed Aug 26 2015 11:55:14 GMT+0800 (CST)
 *
 * ================================================================
 * Copyright  xdf
 *
 * Licensed under the MIT License
 * You may not use this file except in compliance with the License.
 *
 * ================================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const spawn = require('win-spawn');
const JAVA_HOME = require('java-home');
const ant = require('ant-lite').binPath;

const _ = require('../lib/helper');
const fileName = require('..').fileName;

const isWindows = _.platform.isWindows;
const cwd = path.join(__dirname, '..');

const MAX_SDK_VERSION = 24;
const MIN_SDK_VERSION = 16;

function selectAndroidSdkSync() {
  const env = global.process.env;

  if (!env.ANDROID_HOME) {
    console.log('ANDROID_HOME is not set');
    return null;
  }

  const platforms = path.join(env.ANDROID_HOME, 'platforms');

  if (!_.isExistedDir(platforms)) {
    console.log('platforms directory is not exist');
    return null;
  }

  var res = fs.readdirSync(platforms);

  res = _.filter(res, n => {
    return !!~n.indexOf('android');
  });

  if (!res.length) {
    console.log('platforms directory is not exist');
    return null;
  }

  res = _.filter(res, n => {
    const version = parseInt(n.split('-').pop());
    return version >= MIN_SDK_VERSION && version <= MAX_SDK_VERSION;
  });

  if (!res.length) {
    console.log('Only support android sdk version between ' +
      MIN_SDK_VERSION + ' and ' + MAX_SDK_VERSION);
    return null;
  }

  return res;
}

var checkEnv = function() {
  return JAVA_HOME.getPath().then(javaHome => {
    console.log('JAVA_HOME is set to ' + javaHome);

    var env = global.process.env;

    if (!env.ANDROID_HOME) {
      console.log('ANDROID_HOME is not set');
      throw new Error('ANDROID_HOME is not set');
    }

    const android = isWindows ? 'android.bat' : 'android';
    const androidTool = path.resolve(env.ANDROID_HOME, 'tools', android);

    if (!_.isExistedFile(androidTool)) {
      console.log('`android` command was not found');
      throw new Error('`android` command was not found');
    }

    var sdkVersion = selectAndroidSdkSync();

    if (!sdkVersion) {
      console.log('no avaliable sdk');
      throw new Error('no avaliable sdk');
    }

    sdkVersion = sdkVersion[sdkVersion.length - 1];

    const args = ['create', 'uitest-project', '-n', fileName, '-t', sdkVersion, '-p', '.'];

    return [androidTool, args];
  });
};

var createUITest = function(res) {
  var androidTool = res[0];
  var args = res[1];
  return new Promise((resolve, reject) => {
    const createProcess = spawn(androidTool, args, {
      cwd: cwd
    });

    createProcess.on('error', err => {
      console.log(err);
      reject(err);
    });

    createProcess.stdout.setEncoding('utf8');
    createProcess.stderr.setEncoding('utf8');

    createProcess.stdout.on('data', data => {
      console.log(data.trim());
    });

    createProcess.stderr.on('data', data => {
      console.log(data.trim());
    });

    createProcess.on('exit', code => {
      if (code !== 0) {
        reject(new Error('setup failed'));
      } else {
        resolve();
      }
    });
  });
};

var buildBootstrap = function() {
  return new Promise((resolve, reject) => {
    var buildProcess = spawn(ant, ['build'], {
      cwd: cwd
    });

    buildProcess.on('error', err => {
      return reject(err);
    });

    buildProcess.stdout.setEncoding('utf8');
    buildProcess.stderr.setEncoding('utf8');

    buildProcess.stdout.on('data', data => {
      console.log(data.trim());
    });
    buildProcess.stderr.on('data', data => {
      console.log(data.trim());
    });

    buildProcess.on('exit', code => {
      if (code !== 0) {
        reject(new Error('build failed'));
      } else {
        console.log(fileName + ' build success!');
        resolve();
      }
    });
  });
};

checkEnv()
  .then(createUITest)
  .then(buildBootstrap)
  .catch((e) => {
    setTimeout(() => {
      throw e;
    });
  });
