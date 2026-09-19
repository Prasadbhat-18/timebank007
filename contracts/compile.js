// ─── contracts/compile.js ───────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import solc from "solc";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractPath = path.join(__dirname, "TimeCredit.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "TimeCredit.sol": {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode"],
      },
    },
  },
};

console.log("Compiling TimeCredit.sol...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const fatalErrors = output.errors.filter((e) => e.severity === "error");
  if (fatalErrors.length > 0) {
    console.error("Compilation failed with errors:", fatalErrors);
    process.exit(1);
  }
  output.errors.forEach((e) => console.warn(e.formattedMessage));
}

const contract = output.contracts["TimeCredit.sol"]["TimeCredit"];
const abi = contract.abi;
const bytecode = "0x" + contract.evm.bytecode.object;

const artifactContent = `// ─── Compiled Artifact for TimeCredit (TBC) ERC-20 Contract ────────────────
export const TimeCreditArtifact = {
  contractName: "TimeCredit",
  abi: ${JSON.stringify(abi, null, 2)},
  bytecode: "${bytecode}",
};

export default TimeCreditArtifact;
`;

const artifactPath = path.join(__dirname, "TimeCreditArtifact.js");
fs.writeFileSync(artifactPath, artifactContent, "utf8");
console.log(`✓ Compiled successfully! Saved artifact to ${artifactPath}`);
console.log(`Bytecode length: ${bytecode.length} chars. ABI methods: ${abi.length}`);
