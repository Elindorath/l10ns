/// <reference path='../Source/Service/System.ts'/>
"use strict";
const child_process_1 = require("child_process");
function run(grunt) {
    grunt.registerTask('diff', function () {
        const done = this.async();
        if (!process.env.DIFF) {
            grunt.log.error('You have not defined your diff tool yet.');
        }
        const currentBaseline = L10ns.joinPath(__dirname, '../../Tests/Baselines/Current');
        const referenceBaseline = L10ns.joinPath(__dirname, '../../Tests/Baselines/Reference');
        const cmd = process.env.DIFF + ' ' + referenceBaseline + ' ' + currentBaseline;
        console.log(cmd);
        child_process_1.exec(cmd, function (_err, stdout, _stderr) {
            if (stdout) {
                console.log(stdout);
            }
            done();
        });
    });
}
module.exports = run;
