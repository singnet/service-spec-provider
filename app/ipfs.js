const path = require("path")
const url = require("url")
const fs = require("fs")

const ipfsAPI = require("ipfs-api")

const { ipfsEndpoint, METADATA_JSON_DIR, MODELS_TAR_DIR } = require("./config.js")
const { withFsCache, uriToHash } = require("./utils.js")


const IPFS_ENDPOINT = ipfsEndpoint
const IPFS_ENDPOINT_OBJECT = url.parse(IPFS_ENDPOINT)

if (IPFS_ENDPOINT_OBJECT.protocol === null) { throw new Error(`IPFS_ENDPOINT must include a protocol (ex: "https://"). ${JSON.stringify(IPFS_ENDPOINT)}`) }
if (IPFS_ENDPOINT_OBJECT.hostname === null) { throw new Error(`IPFS_ENDPOINT must include a hostname (ex: "ipfs.io"). ${JSON.stringify(IPFS_ENDPOINT)}`) }
if (IPFS_ENDPOINT_OBJECT.port === null) { throw new Error(`IPFS_ENDPOINT must include a port (ex: ":80"). ${JSON.stringify(IPFS_ENDPOINT)}`) }

const ipfs = ipfsAPI(IPFS_ENDPOINT_OBJECT.hostname, IPFS_ENDPOINT_OBJECT.port, { "protocol": IPFS_ENDPOINT_OBJECT.protocol.slice(0, -1) })


async function getModelURI(metadataJSONHash) {
  const metadataJSONPath = path.join(METADATA_JSON_DIR, metadataJSONHash)
  try {
    const metadataJSON = await withFsCache(metadataJSONPath, ipfs.cat)(metadataJSONHash)
    return JSON.parse(metadataJSON.toString("utf-8")).modelURI
  } catch(e) {
    throw new Error(`Failed to get object ${metadataJSONHash} from IPFS endpoint ${IPFS_ENDPOINT}. Error: ${e.message}`)
  }
}

async function getServiceModelTarStream(metadataJSONHash) {
  const modelTarPath = path.join(MODELS_TAR_DIR, metadataJSONHash)
  const modelTar = await withFsCache(modelTarPath, ipfs.cat, fs.createReadStream)(uriToHash(await getModelURI(metadataJSONHash)))
  return modelTar
}


module.exports = {
  getServiceModelTarStream
}
