#!/bin/sh
set -eu

envsubst \
  < /usr/share/nginx/html/admin-console/runtime-config.js.template \
  > /usr/share/nginx/html/admin-console/runtime-config.js

exec nginx -g 'daemon off;'