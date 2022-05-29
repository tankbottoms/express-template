FROM node:13.11-alpine
ARG npm_token
EXPOSE 80
WORKDIR /usr/src/app

RUN npm config set registry https://client.example.com/ && \
npm config set always-auth true && \
npm config set //client.example.com/:_authToken $npm_token
COPY package.json .
RUN yarn
COPY . .
RUN yarn build
ENTRYPOINT ["node", "dist/index"]
