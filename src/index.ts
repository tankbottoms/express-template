import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import basicAuth from "express-basic-auth";
import bodyParser from "body-parser";
import fetch from "isomorphic-fetch";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

dotenv.config();

const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

const app = express();

const logStream = fs.createWriteStream(path.join(__dirname, "log.log"), {
    flags: "a",
});

app.use(morgan("combined", { stream: logStream }));
app.use(cors());
app.use(bodyParser.json());

let jwt: string | null = null;
const generateJwt = async () => {
    const resp = await fetch("https://client.example.com/apiclient", {
        method: "POST",
        body: JSON.stringify({
            glba: "otheruse",
            none: "verification",
        }),
        headers: {
            Authorization:
                "Basic " +
                Buffer.from(
                    `${process.env.SERVICE_USERNAME}:${process.env.SERVICE_PASSWORD}`
                )
                    .toString("base64")
                    .replace("\n", ""),
        },
    });
    const tempJwt = await resp.text();
    jwt = tempJwt.replace("\n", "");
};

const fetchShare = async (query) => {
    if (typeof query !== "string") {
        query = JSON.stringify(query);
    }

    const resp = await fetch("https://client.example.com/search", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + jwt,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: query,
    });
    return resp.json();
};

const authMiddleware = basicAuth({
    users: { [process.env.USERNAME!]: process.env.PASSWORD! },
    unauthorizedResponse: "Bad auth",
});

app.get("/health", async (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: "OK",
        timestamp: Date.now(),
    };
    try {
        res.send(healthcheck);
    } catch (e) {
        healthcheck.message = e;
        res.status(503).send();
    }
});

app.get("/share", async (req, res) => {
    console.log("get share");
    res.send("Use POST to request specific share.");
});

app.post("/share", authMiddleware, async (req, res) => {
    console.log("share request...");
    const body = req.body;
    if (!jwt) {
        await generateJwt();
    }
    let resp = await fetchShare(body);
    if (resp.error === "Unauthorized") {
        await generateJwt();
        resp = await fetchPerson(body);
    }
    res.json(resp);
});

https
    .createServer(
        {
            key: fs.readFileSync("./private"),
            cert: fs.readFileSync("./crt"),
            ca: fs.readFileSync("./cabundle"),
        },
        app
    )
    .listen(HTTPS_PORT, () => console.log(`express endpoints listening on ${HTTPS_PORT}`));

http.createServer(app).listen(HTTP_PORT, () =>
    console.log(`HTTP listening on ${HTTP_PORT}`)
);
