import type { CreateModelSpecInput, SubmissionInput } from "@sharellama/model";

type ParsedCommand = Partial<SubmissionInput> & Partial<CreateModelSpecInput>;

interface FlagDef {
  names: string[];
  field: keyof SubmissionInput | "nGpuLayers" | "threads" | "batchSize";
  parse: (value: string) => string | number | undefined;
}

const parseString = (value: string): string | undefined => (value ? value : undefined);
const parseNumber = (value: string): number | undefined => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};
const parseInt_ = (value: string): number | undefined => {
  const num = parseInt(value, 10);
  return Number.isFinite(num) ? num : undefined;
};

const FLAG_DEFS: FlagDef[] = [
  { names: ["-m", "--model"], field: "modelSlug", parse: parseString },
  { names: ["-c", "--ctx-size", "--context-length"], field: "contextLength", parse: parseInt_ },
  { names: ["--temp", "--temperature"], field: "temperature", parse: parseNumber },
  { names: ["--top-p"], field: "topP", parse: parseNumber },
  { names: ["--top-k"], field: "topK", parse: parseInt_ },
  { names: ["--min-p"], field: "minP", parse: parseNumber },
  {
    names: ["--repeat-penalty", "--rep-penalty", "--presence-penalty"],
    field: "repeatPenalty",
    parse: parseNumber,
  },
  { names: ["--mirostat"], field: "mirostat", parse: parseInt_ },
  { names: ["--mirostat-tau"], field: "mirostatTau", parse: parseNumber },
  { names: ["--mirostat-eta"], field: "mirostatEta", parse: parseNumber },
  { names: ["--seed"], field: "seed", parse: parseInt_ },
  { names: ["-ngl", "--n-gpu-layers", "--gpu-layers"], field: "nGpuLayers", parse: parseInt_ },
  { names: ["-t", "--threads"], field: "threads", parse: parseInt_ },
  { names: ["-b", "--batch-size"], field: "batchSize", parse: parseInt_ },
];

const QUANT_PATTERNS = [
  /F16/i,
  /F32/i,
  /BF16/i,
  /Q8_0/i,
  /Q6_K/i,
  /Q5_K_M/i,
  /Q5_K_S/i,
  /Q5_K_L/i,
  /Q5_0/i,
  /Q5_1/i,
  /Q4_K_M/i,
  /Q4_K_S/i,
  /Q4_K_L/i,
  /Q4_0/i,
  /Q4_1/i,
  /Q4_0_4_4/i,
  /Q4_0_4_8/i,
  /Q4_0_8_8/i,
  /Q3_K_M/i,
  /Q3_K_S/i,
  /Q3_K_L/i,
  /Q3_K/i,
  /Q2_K/i,
  /Q2_K_S/i,
  /Q2_K_L/i,
  /IQ4_NL/i,
  /IQ4_XS/i,
  /IQ3_M/i,
  /IQ3_S/i,
  /IQ3_XXS/i,
  /IQ2_M/i,
  /IQ2_S/i,
  /IQ2_XS/i,
  /IQ2_XXS/i,
  /IQ1_M/i,
  /IQ1_S/i,
  /TQ1_0/i,
  /TQ2_0/i,
  /MXFP4/i,
];

function extractQuantization(modelName: string): string | undefined {
  const upperName = modelName.toUpperCase();
  for (const pattern of QUANT_PATTERNS) {
    const match = upperName.match(pattern);
    if (match) {
      return match[0].toUpperCase();
    }
  }
  return undefined;
}

function extractModelBasename(modelPath: string): string {
  const filename = modelPath.split("/").pop() ?? modelPath;
  return filename.replace(/\.gguf$/i, "").replace(/\.bin$/i, "");
}

function detectRuntime(command: string): string | undefined {
  const cmd = command.toLowerCase();
  if (cmd.includes("llama-server")) {
    return "llama.cpp";
  }
  if (cmd.includes("llama-cli") || cmd.includes("llama.cpp") || cmd.includes("./main")) {
    return "llama.cpp";
  }
  if (cmd.includes("llama-bench")) {
    return "llama.cpp";
  }
  if (cmd.includes("ollama")) {
    return "ollama";
  }
  if (cmd.includes("llamafile")) {
    return "llamafile";
  }
  if (cmd.includes("text-generation-webui") || cmd.includes("oobabooga")) {
    return "text-generation-webui";
  }
  if (cmd.includes("koboldcpp")) {
    return "koboldcpp";
  }
  if (cmd.includes("lm-studio") || cmd.includes("lmstudio")) {
    return "lm-studio";
  }
  return undefined;
}

function extractVersion(command: string): string | undefined {
  const versionMatch = command.match(/--version\s+(\S+)/i);
  if (versionMatch) {
    return versionMatch[1];
  }
  const buildMatch = command.match(/b(\d{4,})/i);
  if (buildMatch) {
    return `b${buildMatch[1]}`;
  }
  return undefined;
}

export function parseLlamaCppCommand(command: string): ParsedCommand {
  if (!command || !command.trim()) {
    return {};
  }

  const result: ParsedCommand & Record<string, unknown> = {
    command: command.trim(),
  };

  const runtime = detectRuntime(command);
  if (runtime) {
    result.runtime = runtime;
  }

  const version = extractVersion(command);
  if (version) {
    result.runtimeVersion = version;
  }

  const tokens = tokenizeCommand(command);

  for (const flagDef of FLAG_DEFS) {
    for (const name of flagDef.names) {
      const value = findFlagValue(tokens, name);
      if (value !== undefined) {
        const parsed = flagDef.parse(value);
        if (parsed !== undefined) {
          if (flagDef.field === "nGpuLayers") {
            result.inferenceParams = {
              ...(result.inferenceParams as Record<string, unknown>),
              nGpuLayers: parsed,
            };
          } else if (flagDef.field === "threads" || flagDef.field === "batchSize") {
            result.inferenceParams = {
              ...(result.inferenceParams as Record<string, unknown>),
              [flagDef.field]: parsed,
            };
          } else {
            (result as Record<string, unknown>)[flagDef.field] = parsed;
          }
        }
        break;
      }
    }
  }

  if (result.modelSlug) {
    const baseName = extractModelBasename(result.modelSlug as string);
    result.modelSlug = baseName;

    if (!result.quantization) {
      result.quantization = extractQuantization(baseName);
    }

    const modelSize = extractModelSizeFromPath(baseName);
    const quantMatch = result.quantization?.match(/Q(\d+)/);
    if (modelSize && quantMatch?.[1]) {
      result.minVramQ4 = estimateVram(modelSize, quantMatch[1]);
    }

    if (!result.title) {
      result.title = `${baseName} Configuration`;
    }
  }

  if (command.includes("--flash-attn")) {
    result.attentionType = "Flash Attention";
  }

  const gpuLayersMatch = command.match(/(?:-ngl|--n-gpu-layers|--gpu-layers)\s+(\d+)/);
  if (gpuLayersMatch && gpuLayersMatch[1] === "999") {
    result.vramGb = undefined;
  }

  return result as ParsedCommand;
}

function tokenizeCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
        tokens.push(current);
        current = "";
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = true;
      quoteChar = char;
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else if (char === " " || char === "\t" || char === "\n") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function findFlagValue(tokens: string[], flagName: string): string | undefined {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === undefined) continue;

    if (token === flagName) {
      return tokens[i + 1];
    }

    if (token.startsWith(flagName + "=")) {
      return token.slice(flagName.length + 1);
    }
  }

  return undefined;
}

function estimateVram(modelSizeGb: number, quantLevel: string): number {
  const quantMultipliers: Record<string, number> = {
    "2": 0.7,
    "3": 0.8,
    "4": 1.0,
    "5": 1.3,
    "6": 1.5,
    "8": 2.0,
  };
  return Math.ceil(modelSizeGb * (quantMultipliers[quantLevel] || 1.0));
}

function extractModelSizeFromPath(modelPath: string): number | undefined {
  const sizeMatch = modelPath.match(/(\d+)[bB]/);
  if (sizeMatch?.[1]) {
    return parseInt(sizeMatch[1], 10);
  }
  return undefined;
}
