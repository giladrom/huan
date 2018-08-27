#!/bin/sh

node users.js community | sort | uniq -c
