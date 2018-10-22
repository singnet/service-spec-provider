const path = require("path")
const fs = require("fs")

const Web3 = require("web3")

const agentABI = require("singularitynet-platform-contracts/abi/Agent.json")
const registryABI = require("singularitynet-platform-contracts/abi/Registry.json")
const registryNetworks = require("singularitynet-platform-contracts/networks/Registry.json")

const { network, infuraKey, ethereumRPCEndpoint, MODELS_JSON_DIR, MODELS_PROTO_DIR } = require("./config.js")
const { untar, uriToHash } = require("./utils.js")
const { getServiceModelTarStream } = require("./ipfs.js")
const { BadRequestError, NotFoundError } = require("./errors.js")


const ETHEREUM_ENDPOINT = typeof network !== "undefined" ?
  `https://${network}.infura.io/${infuraKey || ""}` :
  ethereumRPCEndpoint


const web3 = new Web3(new Web3.providers.HttpProvider(ETHEREUM_ENDPOINT))

const agent = withAddress(new web3.eth.Contract(agentABI))
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

async function getContractMetadataHash(address) {
  try {
    const contract = await agent(address)
    const metadataURI = await contract.methods.metadataURI().call() 
    return uriToHash(metadataURI)
  } catch(e) {
    if (e.message.startsWith("Returned values aren't valid")) {
      throw new NotFoundError(`Error while trying to get metadataURI for address ${address}. ${address} is probably not an instance of an Agent contract. ${e}`)
    } else {
      throw new Error(e)
    } 
  }
}

async function getServiceRegistration(orgName, serviceName) {
  const contract = await registry(registryNetworks)
  return await contract.methods.getServiceRegistrationByName(web3.utils.fromAscii(orgName), web3.utils.fromAscii(serviceName)).call()
}

/*
async function getProtoServiceSpec(metadataJSONHash, protoPath) {
  if (!services.hasOwnProperty(metadataJSONHash)) {
    const files = await Promise.all(klaw(protoPath, { "nodir": true })
      .map(async file => await Promise.all([ path.relative(__dirname, file.path), readFile(file.path, "utf8") ])))
    const serviceEntries = await files
      .map(([ filePath, fileBody ]) =>
        fileBody.split(os.EOL)
          .filter(line => line.startsWith("service"))
          .map(line => ({ filePath, "serviceName": line.split(" ")[1] }))
      ).reduce((acc, cur) => acc.concat(cur), [])
    if (serviceEntries.length < 1) { throw new BadRequestError("No service in service spec") }
    else {
      services[metadataJSONHash] = serviceEntries
    }
  }
  return services[metadataJSONHash]
}
*/

function getServicesAtMetadataHash(metadataJSONHash) {
  const services = {}
  return [ metadataJSONHash, services ]
}

async function getServiceSpecJSON(orgName, serviceName) {
  const serviceRegistration = await getServiceRegistration(orgName, serviceName)
  const metadataJSONHash = await getContractMetadataHash(serviceRegistration.agentAddress)

  const jsonPath = path.join(MODELS_JSON_DIR, orgName, serviceName)
  if (!fs.existsSync(jsonPath)) {
    const protoPath = path.join(MODELS_PROTO_DIR, metadataJSONHash)
    if (!fs.existsSync(protoPath)) {
      const stream = await getServiceModelTarStream(metadataJSONHash)
      untar(stream, protoPath)
    }
    const services = await getServicesAtMetadataHash(metadataJSONHash)
    /*
    const services = await getProtoServiceSpec(metadataJSONHash, protoPath)
    const service = services.find(serviceObject => serviceObject.serviceName === serviceName)
    const root = await protobuf.load(path.join(__dirname, service.filePath))
    if (!fs.existsSync(path.join(MODELS_JSON_DIR, orgName))) { fs.mkdirSync(path.join(MODELS_JSON_DIR, orgName)) }
    fs.writeFileSync(jsonPath, JSON.stringify(root), "utf8")
    */
  }
  //return fs.readFileSync(jsonPath, "utf8")
}


module.exports = {
  getServiceSpecJSON
}
