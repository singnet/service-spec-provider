// Crashes application on unhandled Promise rejection instead of just printing a warning to console
process.on("unhandledRejection", err => { throw err })

const express = require("express")

const { port } = require("./config.js")
const { getErrorStatusCode } = require("./utils.js")
const { getServiceSpecJSON } = require("./service.js")


const app = express()


app.get("/test", async (req, res) => {
  try {
    // TODO: fix
    // const response = await getModelURI("test")
    const response = { "we": "we" }
    return res.type("json").status(200).send(response)
  } catch(e) {
    return res.type("json").status(getErrorStatusCode(e)).send({ "error": e.message })
  }
})


app.get("/:orgName/:serviceName", async (req, res) => {
  try {
    const response = await getServiceSpecJSON(req.params.orgName, req.params.serviceName)
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
