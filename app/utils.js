const fs = require("fs")
// const util = require("util")

const tar = require("tar-fs")
const gunzip = require("gunzip-maybe")


function withFsCache(path, getterFunction, readerFunction = fs.readFileSync, encoding = "utf8"){
  return async function(...args) {
    let object = undefined
    if (!fs.existsSync(path)) {
      object = await getterFunction(...args)
      fs.writeFileSync(path, object, encoding)
    }
    return readerFunction(path, encoding)
  }
}

function getErrorStatusCode(e) {
  switch (e.constructor.name) {
    case "NotFoundError":
      return 404
    case "BadRequestError":
      return 400
    default:
      console.error(e.message)
      return 500
  }
}

function uriToHash(uri) {
  return uri.split("/").slice(-1).join("") 
}

function untar(sourceStream, destDir) {
  const stream = sourceStream.pipe(gunzip()).pipe(tar.extract(destDir))
  return new Promise((resolve, reject) => {
    stream.on("end", () => { resolve("end") })
    stream.on("finish", () => { resolve("finish") })
    stream.on("error", error => { reject(error) })
  })
}

module.exports = {
  withFsCache,
  getErrorStatusCode,
  uriToHash,
  untar,
  //"readFile": util.promisify(fs.readFile)
}
