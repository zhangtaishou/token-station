FROM node:18-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
EXPOSE 3456
CMD ["node", "server.js"]

RUN node -e "let c=require('fs').readFileSync('server.js','utf-8');c=c.replace('pathname)','pathname.replace(/^\\//,""))';require('fs').writeFileSync('server.js',c)"
