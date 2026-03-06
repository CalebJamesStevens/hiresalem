import path from "node:path"
import { fileURLToPath } from "node:url"

import { config } from "dotenv"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

config({
  path: path.resolve(dirname, "../../.env")
})
