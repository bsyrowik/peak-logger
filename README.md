# Peak Logger

[![GitHub license](https://img.shields.io/badge/License-MIT-brightgreen.svg?style=flat-square)](https://github.com/bsyrowik/peak-logger/blob/main/LICENSE.txt)
[![GitHub contributors](https://img.shields.io/github/contributors/bsyrowik/peak-logger.svg)](https://GitHub.com/bsyrowik/peak-logger/graphs/contributors/)
[![GitHub issues](https://img.shields.io/github/issues/bsyrowik/peak-logger.svg)](https://GitHub.com/bsyrowik/peak-logger/issues/)
[![GitHub pull-requests](https://img.shields.io/github/issues-pr/bsyrowik/peak-logger.svg)](https://GitHub.com/bsyrowik/peak-logger/pulls/)
[![GitHub watchers](https://img.shields.io/github/watchers/bsyrowik/peak-logger.svg?style=social&label=Watch)](https://GitHub.com/bsyrowik/peak-logger/watchers/)
[![GitHub forks](https://img.shields.io/github/forks/bsyrowik/peak-logger.svg?style=social&label=Fork)](https://GitHub.com/bsyrowik/peak-logger/network/)
[![GitHub stars](https://img.shields.io/github/stars/bsyrowik/peak-logger.svg?style=social&label=Star)](https://GitHub.com/bsyrowik/peak-logger/stargazers/)

A basic web app that auto-detects summited peaks on Strava activities and optionally logs them to [peakbagger.com](https://peakbagger.com).


## How it Works

PeakLogger will automatically annotate summited peaks in the Strava activity description when you log a new activity.
<br>
<img src="./public/strava_activity_short.jpeg" style="max-width:350px;"/>


Peakbagger can automatically log ascents to your Peakbagger.com account.
<br>
<img src="./public/peakbagger_log_short.jpeg" style="max-width:350px;"/>


Peakbagger provides a convenient dashboard for viewing and analyzing your activities, and the peaks bagged on each recorded activity.
<br>
<img src="public/activity_example.png" style="max-width:350px;"/>


A deployed version of the app can be found here:
https://peaklogger.app


## Technology

This web app is built using Astro and is deployed on AWS.



![Powered by Strava](./public/api_logo_pwrdBy_strava_stack_light.png)
