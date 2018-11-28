// Crashes application on unhandled Promise rejection instead of just printing a warning to console
process.on("unhandledRejection", err => { throw err })

const express = require("express")

const { port } = require("./config.js")
const { getErrorStatusCode } = require("./utils.js")
const { getServiceMetadataJSONHash, getServiceSpecJSON } = require("./service.js")


const app = express()

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  next()
})

app.get("/test", async (req, res) => {
  try {
    const response = await getServiceSpecJSON("test")
    return res.type("json").status(200).send(response)
  } catch(e) {
    return res.type("json").status(getErrorStatusCode(e)).send({ "error": e.message })
  }
})

app.get("/:agentAddress", async (req, res) => {
  try {
    const serviceMetadataJSONHash = await getServiceMetadataJSONHash(req.params.agentAddress)
    const response = await getServiceSpecJSON(serviceMetadataJSONHash)
    return res.type("json").status(200).send(response)
  } catch(e) {
    return res.type("json").status(getErrorStatusCode(e)).send({ "error": e.message })
  }
})

app.get("/:orgName/:serviceName", async (req, res) => {
  try {
    const serviceMetadataJSONHash = await getServiceMetadataJSONHash(req.params.orgName, req.params.serviceName)
    const response = await getServiceSpecJSON(serviceMetadataJSONHash)
    return res.type("json").status(200).send(response)
  } catch(e) {
    return res.type("json").status(getErrorStatusCode(e)).send({ "error": e.message })
  }
})

app.get("*", (req, res) => res.type("json").status(404).send({ "error": `${req.method} ${req.originalUrl} not found` }))

app.disable("x-powered-by")

app.listen(port, () => {
  console.log("Running on port", port) }
)
