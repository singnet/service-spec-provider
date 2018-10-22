const path = require("path")
const fs = require("fs")

const Ajv = require("ajv")


function getConfig(configPath) {
  if (typeof configPath !== "undefined") {
    const configAbsolutePath = path.isAbsolute(configPath) ? configPath : path.join(__dirname, "..", configPath)
    if (!fs.existsSync(configAbsolutePath)) { throw new Error(`configuration file not found at ${configAbsolutePath}`) }
    const config = require(configAbsolutePath)
    const configSchema = require(path.join(__dirname, "..", "config", "config.schema.json"))

    const ajv = new Ajv()
    if (!ajv.validate(configSchema, config)) { throw new Error(ajv.errorsText()) }
    return config
  } else {
    return {
      "ipfsEndpoint": "http://localhost:5001",
      "ethereumRPCEndpoint": "http://localhost:8545",
      "port": 9000
    }
  }
}


const config = getConfig(process.argv[2])

config.METADATA_JSON_DIR = path.join(__dirname, "..", "storage", "metadata")
config.MODELS_TAR_DIR = path.join(__dirname, "..", "storage", "models", "tar")
config.MODELS_PROTO_DIR = path.join(__dirname, "..", "storage", "models", "proto")
config.MODELS_JSON_DIR = path.join(__dirname, "..", "storage", "models", "json")

if (!fs.existsSync(config.METADATA_JSON_DIR)) { fs.mkdirSync(config.METADATA_JSON_DIR) }
if (!fs.existsSync(config.MODELS_TAR_DIR)) { fs.mkdirSync(config.MODELS_TAR_DIR) }
if (!fs.existsSync(config.MODELS_PROTO_DIR)) { fs.mkdirSync(config.MODELS_PROTO_DIR) }
if (!fs.existsSync(config.MODELS_JSON_DIR)) { fs.mkdirSync(config.MODELS_JSON_DIR) }


module.exports = { ...config }
