#!/usr/bin/env bun
import { Box, Text, render, useInput } from "ink";
import TextInput from "ink-text-input";
import { useCallback, useEffect, useState } from "react";

import { generateText, type GenerateFormat } from "./commands/generate";

const LOGO = [
  "█▀▀ █▀▀█ █  █ █▀▀ █▀▄▀█ █▀▀█ █▀▀▄ █▀▀█ █▀▀ █▀▀",
  "▀▀█ █    █▀▀█ █▀▀ █ ▀ █ █▄▄█ █▀▀▄ █▄▄█ ▀▀█ █▀▀",
  "▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀ ▀   ▀ ▀  ▀ ▀▀▀  ▀  ▀ ▀▀▀ ▀▀▀",
] as const;

type ParsedArgs =
  | { interactive: true }
  | { help: true }
  | {
      db: "postgres";
      format: GenerateFormat;
      help: false;
      interactive: false;
      out?: string;
      schemaPath: string;
    };

const HELP_TEXT = [
  ...LOGO,
  "",
  "Usage:",
  "  schemabase                                         Interactive mode",
  "  schemabase generate <path> [--format sql|ir] [--db postgres] [--out file]",
  "",
  "Examples:",
  "  schemabase                              # Opens interactive CLI",
  "  schemabase generate schema.json",
  "  schemabase generate schemas/ --out init.sql",
  "  schemabase generate schema.json --format ir",
  "",
].join("\n");

const isHelp = (cmd: string | undefined) => cmd === "-h" || cmd === "--help";

const parseFormat = (v: string | undefined): GenerateFormat | undefined => {
  if (v === "sql" || v === "ir") {
    return v;
  }
  return undefined;
};

const parseDb = (v: string | undefined): "postgres" | undefined => {
  if (v === "postgres") {
    return v;
  }
  return undefined;
};

const parseFlags = (rest: string[]) => {
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    if (!key?.startsWith("--")) {
      continue;
    }

    const value = rest[i + 1];
    if (typeof value === "string" && !value.startsWith("--")) {
      flags.set(key, value);
      i += 1;
      continue;
    }

    flags.set(key, "");
  }
  return flags;
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const [cmd, schemaPath, ...rest] = argv;

  if (!cmd) {
    return { interactive: true };
  }

  if (isHelp(cmd)) {
    return { help: true };
  }

  if (cmd !== "generate" || !schemaPath) {
    return { help: true };
  }

  const flags = parseFlags(rest);
  const rawFormat = flags.get("--format");
  const rawDb = flags.get("--db");
  const out = flags.get("--out");

  const parsedFormat = rawFormat ? parseFormat(rawFormat) : undefined;
  const parsedDb = rawDb ? parseDb(rawDb) : undefined;

  if (rawFormat && !parsedFormat) {
    return { help: true };
  }
  if (rawDb && !parsedDb) {
    return { help: true };
  }

  return {
    db: parsedDb ?? "postgres",
    format: parsedFormat ?? "sql",
    help: false,
    interactive: false,
    ...(out ? { out } : {}),
    schemaPath,
  };
};

interface OutputEntry {
  id: number;
  text: string;
  type: "command" | "result" | "error";
}

const getEntryColor = (type: OutputEntry["type"]) => {
  if (type === "command") {
    return "gray";
  }
  if (type === "error") {
    return "red";
  }
  return "white";
};

const InteractiveApp = () => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<OutputEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setNextId] = useState(0);

  // Command history for up/down navigation
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState("");

  const addToHistory = useCallback(
    (text: string, type: OutputEntry["type"]) => {
      setNextId((prev) => {
        const newId = prev + 1;
        setHistory((h) => [...h, { id: newId, text, type }]);
        return newId;
      });
    },
    []
  );

  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      // Add to command history and reset navigation state
      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
      setSavedInput("");

      setInput("");
      addToHistory(`> ${trimmed}`, "command");

      const [cmd, ...cmdArgs] = trimmed.split(/\s+/);

      if (cmd === "help" || cmd === "?") {
        addToHistory(
          "Commands:\n  generate <path> [--format sql|ir]  Generate SQL from schema\n  help                               Show this help\n  clear                              Clear history",
          "result"
        );
        return;
      }

      if (cmd === "clear") {
        setHistory([]);
        return;
      }

      if (cmd === "generate") {
        const [schemaPath, ...flagArgs] = cmdArgs;
        if (!schemaPath) {
          addToHistory(
            "Error: Missing schema path. Usage: generate <path> [--format sql|ir]",
            "error"
          );
          return;
        }

        const flags = parseFlags(flagArgs);
        const rawFormat = flags.get("--format");
        const format = rawFormat ? parseFormat(rawFormat) : "sql";

        if (rawFormat && !format) {
          addToHistory("Error: Invalid format. Use sql or ir", "error");
          return;
        }

        setIsProcessing(true);
        try {
          const result = await generateText(schemaPath, format ?? "sql");
          addToHistory(result, "result");
        } catch (error) {
          addToHistory(`Error: ${String(error)}`, "error");
        }
        setIsProcessing(false);
        return;
      }

      addToHistory(
        `Unknown command: ${cmd}. Type help for available commands.`,
        "error"
      );
    },
    [addToHistory]
  );

  useInput((_, key) => {
    if (key.ctrl && _ === "c") {
      process.exit(0);
    }

    // Navigate command history with up/down arrows
    if (key.upArrow && commandHistory.length > 0 && !isProcessing) {
      if (historyIndex === -1) {
        // Starting to browse history, save current input
        setSavedInput(input);
        const newIndex = commandHistory.length - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex] ?? "");
      } else if (historyIndex > 0) {
        // Go further back in history
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex] ?? "");
      }
    }

    if (key.downArrow && historyIndex !== -1 && !isProcessing) {
      if (historyIndex < commandHistory.length - 1) {
        // Go forward in history
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex] ?? "");
      } else {
        // Reached the end, restore saved input
        setHistoryIndex(-1);
        setInput(savedInput);
        setSavedInput("");
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="#818CF8">{LOGO.join("\n")}</Text>
      <Text> </Text>
      <Text dimColor>Type help for commands, Ctrl+C to exit</Text>
      <Text> </Text>

      {history.map((entry) => (
        <Text key={entry.id} color={getEntryColor(entry.type)}>
          {entry.text}
        </Text>
      ))}

      <Box>
        <Text color="#6366F1" bold>
          {">"}{" "}
        </Text>
        {isProcessing ? (
          <Text color="#818CF8">Processing...</Text>
        ) : (
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
          />
        )}
      </Box>
    </Box>
  );
};

interface SingleCommandAppProps {
  schemaPath: string;
  format: GenerateFormat;
}

const SingleCommandApp = ({ schemaPath, format }: SingleCommandAppProps) => {
  const [output, setOutput] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const text = await generateText(schemaPath, format);
        if (cancelled) {
          return;
        }
        setOutput(text);
        setStatus("done");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setOutput(`Error: ${String(error)}`);
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schemaPath, format]);

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="#818CF8">{LOGO.join("\n")}</Text>
      <Text> </Text>
      {status === "loading" && <Text color="#818CF8">Generating...</Text>}
      {status === "done" && (
        <>
          <Text>{output}</Text>
          <Text color="#6366F1">✓ Press Ctrl+C to exit</Text>
        </>
      )}
      {status === "error" && (
        <>
          <Text color="red">{output}</Text>
          <Text dimColor>Press Ctrl+C to exit</Text>
        </>
      )}
    </Box>
  );
};

const args = parseArgs(process.argv.slice(2));

if ("help" in args && args.help) {
  process.stdout.write(`${HELP_TEXT}\n`);
  process.exit(0);
}

if ("out" in args && args.out) {
  try {
    const outText = await generateText(args.schemaPath, args.format);
    await Bun.write(args.out, outText);
    process.stdout.write(`Wrote ${args.out}\n`);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Error: ${String(error)}\n`);
    process.exit(1);
  }
}

if (process.stdout.isTTY) {
  const isInteractive = "interactive" in args && args.interactive;
  const instance = render(
    isInteractive ? (
      <InteractiveApp />
    ) : (
      <SingleCommandApp schemaPath={args.schemaPath} format={args.format} />
    )
  );
  await instance.waitUntilExit();
} else {
  if ("interactive" in args && args.interactive) {
    process.stderr.write("Interactive mode requires a TTY\n");
    process.exit(1);
  }
  try {
    const out = await generateText(args.schemaPath, args.format);
    process.stdout.write(out);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Error: ${String(error)}\n`);
    process.exit(1);
  }
}
