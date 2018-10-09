# service-spec-provider

This service provides a user with a protobuf.js compatible JSON service definition via HTTP by supplying the Ethereum address of the Agent smart contract.

## Development instructions
* Install [Node.js and npm](https://nodejs.org) (node v8.10.0, npm 5.6.0)
* `npm install` to get dependencies
* Optionally provide a configuration file adhering to the JSON Schema specified in `config.schema.json`. See `config.json.sample` for an example.
    * If no configuration file is specified, the Node will assume a local Ethereum RPC endpoint and IPFS RPC endpoint should be used
* `node . [<configpath>]` to run the web server, optionally using the specified config file
