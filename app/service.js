const path = require("path")
const { writeFileSync, existsSync } = require("fs")
const os = require("os")

const Web3 = require("web3")
const klaw = require("klaw-sync")
const protobuf = require("protobufjs")

const registryABI = require("singularitynet-platform-contracts/abi/Registry.json")
const registryNetworks = require("singularitynet-platform-contracts/networks/Registry.json")

const { network, infuraKey, ethereumRPCEndpoint, MODELS_JSON_DIR, MODELS_PROTO_DIR } = require("./config.js")
const { readFile, untar, uriToHash } = require("./utils.js")
const { getServiceModelTarStream } = require("./ipfs.js")
const { BadRequestError } = require("./errors.js")


const ETHEREUM_ENDPOINT = typeof network !== "undefined" ?
  `https://${network}.infura.io/${infuraKey || ""}` :
  ethereumRPCEndpoint


const web3 = new Web3(new Web3.providers.HttpProvider(ETHEREUM_ENDPOINT))

const registry = withAddress(new web3.eth.Contract(registryABI))


function withAddress (contract) {
  const cache = {}
  let networkId = undefined

  return async (addressSource) => {
    if (typeof networkId === "undefined") {
      const networkIdInt = await web3.eth.net.getId()
      networkId = networkIdInt.toString()
    }

    let address

    if (web3.utils.isAddress(addressSource)) {
      address = addressSource
    } else if (typeof addressSource === "object" && addressSource.hasOwnProperty(networkId)) {
      address = addressSource[networkId].address
    } else {
      throw new BadRequestError(`${addressSource} must be either a valid Ethereum address or a "networks" object with { [networkId]: address }`)
    }

    if (!cache.hasOwnProperty(networkId)) {
      cache[networkId] = {}
    }

    if (!cache.hasOwnProperty(address)) {
      cache[networkId][address] = contract.clone()
      cache[networkId][address].options.address = address
    }

    return cache[networkId][address]
  }
}

async function getServiceRegistration(orgId, serviceId) {
  const contract = await registry(registryNetworks)
  return contract.methods.getServiceRegistrationById(web3.utils.fromAscii(orgId), web3.utils.fromAscii(serviceId)).call()
}

async function isServiceFile(path) {
  const file = await readFile(path, "utf8")
  return file.split(os.EOL).some(line => line.startsWith("service"))
}

async function loadServiceSpecJSONsFromProto(metadataJSONHash) {
  const filePaths = klaw(path.join(MODELS_PROTO_DIR, metadataJSONHash), { "nodir": true })
    .map(file => file.path)
  const pathsWithServices = await Promise.all(filePaths.map(async(path) => Promise.all([ path, await isServiceFile(path) ])))
  const filteredPaths = pathsWithServices.filter(([ , isService ]) => isService).map(([ path ]) => path)
  const serviceEntries = Promise.all(filteredPaths.map(path => protobuf.load(path)))
  return serviceEntries
}

async function getServiceMetadataJSONHash(orgId, serviceId) {
  const serviceRegistration = await getServiceRegistration(orgId, serviceId)
  return uriToHash(web3.utils.hexToUtf8(serviceRegistration.metadataURI))
}

async function getServiceSpecJSON(metadataJSONHash) {
  const jsonPath = path.join(MODELS_JSON_DIR, metadataJSONHash)
  if (!existsSync(jsonPath)) {
    const protoPath = path.join(MODELS_PROTO_DIR, metadataJSONHash)
    if (!existsSync(protoPath)) {
      const stream = await getServiceModelTarStream(metadataJSONHash)
      await untar(stream, protoPath)
    }
    const services = await loadServiceSpecJSONsFromProto(metadataJSONHash)
    writeFileSync(jsonPath, JSON.stringify(services), "utf8")
  }

  return await readFile(jsonPath, "utf8")
} 


module.exports = {
  getServiceMetadataJSONHash,
  getServiceSpecJSON
}
