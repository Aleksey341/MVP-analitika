#!/bin/bash
# Build frontend and copy to public/
cd frontend
npm install
npm run build
rm -rf ../public/react-app
cp -r dist ../public/react-app
echo "Frontend built and copied to public/react-app"
