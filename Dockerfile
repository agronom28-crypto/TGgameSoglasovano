FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html level-select.html level-select.css leaderboard.css progress.js app-config.js favicon.ico /usr/share/nginx/html/
COPY level1 /usr/share/nginx/html/level1
COPY level2 /usr/share/nginx/html/level2
COPY level3 /usr/share/nginx/html/level3
COPY level4 /usr/share/nginx/html/level4
COPY level5 /usr/share/nginx/html/level5
COPY Pictures /usr/share/nginx/html/Pictures
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
