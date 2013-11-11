#!/usr/bin/env bash

echo "========================="
echo "Generate war"
echo "========================="
pwd

rm -rf target
r.js -o build/app.build.js
cd target
rm -rf build
